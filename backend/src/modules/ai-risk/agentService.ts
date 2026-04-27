import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../../lib/config.js";
import { runGeminiTriagem } from "../../lib/gemini.js";
import { logStructured } from "../../lib/logger.js";
import { evaluateNadirFeverEmergency } from "../alerts/nadirFeverRules.js";

const EMERGENCY_MESSAGE =
  "Atenção: devido à fase atual do seu tratamento, febre ou calafrios exigem avaliação urgente. Dirija-se ao pronto-socorro mais próximo agora e avise sua equipe de cuidados.";

function signHospitalAlertPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

export type AgentResult = {
  reply: string;
  emergency: boolean;
  symptomLogged: boolean;
  webhookSent: boolean;
};

export async function processAgentMessage(
  env: Env,
  supabase: SupabaseClient,
  userId: string,
  message: string
): Promise<AgentResult> {
  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .select("id, is_in_nadir, primary_cancer_type, hospital_id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!patient) {
    return {
      reply:
        "Complete seu cadastro de paciente no app antes de usar o assistente de sintomas.",
      emergency: false,
      symptomLogged: false,
      webhookSent: false,
    };
  }

  const { data: cycles } = await supabase
    .from("treatment_cycles")
    .select("id, protocol_name, start_date, end_date, status")
    .eq("patient_id", patient.id)
    .eq("status", "active")
    .limit(1);

  const activeCycle = cycles?.[0];
  const { severeFever, tempFromText } = evaluateNadirFeverEmergency(message, patient.is_in_nadir);

  if (severeFever) {
    await supabase.from("symptom_logs").insert({
      patient_id: patient.id,
      cycle_id: activeCycle?.id ?? null,
      symptom_category: "fever",
      severity: "life_threatening",
      body_temperature: tempFromText ?? null,
      logged_at: new Date().toISOString(),
      notes: message.slice(0, 2000),
    });

    await supabase.rpc("record_audit", {
      p_target_patient_id: patient.id,
      p_action: "EMERGENCY_TRIGGER",
      p_metadata: { source: "rule_nadir_fever" },
    });

    let webhookSent = false;
    if (env.HOSPITAL_ALERT_WEBHOOK_URL && !env.HOSPITAL_ALERT_WEBHOOK_SECRET) {
      logStructured("hospital_alert_webhook_skipped", {
        reason: "missing_HOSPITAL_ALERT_WEBHOOK_SECRET",
      });
    }
    if (env.HOSPITAL_ALERT_WEBHOOK_URL && env.HOSPITAL_ALERT_WEBHOOK_SECRET) {
      try {
        const payload = {
          type: "EMERGENCY_NADIR_FEVER" as const,
          patient_id: patient.id,
          hospital_id: patient.hospital_id,
          ts: new Date().toISOString(),
        };
        const raw = JSON.stringify(payload);
        const sig = signHospitalAlertPayload(raw, env.HOSPITAL_ALERT_WEBHOOK_SECRET);
        await fetch(env.HOSPITAL_ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": sig,
          },
          body: raw,
        });
        webhookSent = true;
      } catch {
        webhookSent = false;
      }
    }

    return {
      reply: EMERGENCY_MESSAGE,
      emergency: true,
      symptomLogged: true,
      webhookSent,
    };
  }

  const contextJson = {
    patient_profile: {
      cancer_type: patient.primary_cancer_type,
      is_in_nadir: patient.is_in_nadir,
      active_cycle: activeCycle ?? null,
    },
    agent_directives:
      "REF: docs — no diagnosis. Support triage and structured symptom logging only.",
  };

  let structured;
  try {
    structured = await runGeminiTriagem(env, message, contextJson);
  } catch {
    return {
      reply:
        "Não foi possível analisar sua mensagem agora. Se estiver em risco, procure atendimento ou ligue para sua clínica.",
      emergency: false,
      symptomLogged: false,
      webhookSent: false,
    };
  }

  let symptomLogged = false;
  if (structured.log_symptom) {
    const { error: insErr } = await supabase.from("symptom_logs").insert({
      patient_id: patient.id,
      cycle_id: activeCycle?.id ?? null,
      symptom_category: structured.log_symptom.symptom_category,
      severity: structured.log_symptom.severity ?? "mild",
      body_temperature: structured.log_symptom.body_temperature ?? null,
      notes: structured.log_symptom.notes ?? null,
    });
    if (!insErr) {
      symptomLogged = true;
      await supabase.rpc("record_audit", {
        p_target_patient_id: patient.id,
        p_action: "AGENT_SYMPTOM_LOG",
        p_metadata: { category: structured.log_symptom.symptom_category },
      });
    }
  }

  return {
    reply: structured.assistant_message,
    emergency: false,
    symptomLogged,
    webhookSent: false,
  };
}
