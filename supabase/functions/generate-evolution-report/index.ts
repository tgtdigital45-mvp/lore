/**
 * Gera relatório HTML de evolução clínica (agregação + opcional LLM).
 * Auth: JWT do staff no POST (validado com getUser); `verify_jwt=false` no config.toml
 * para o gateway não bloquear OPTIONS (CORS preflight sem Authorization).
 * Body: { patient_id: uuid, horizon_days?: number }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  const cors = corsHeaders(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!url || !anon || !authHeader) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { patient_id?: string; horizon_days?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const patientId = body.patient_id;
  if (!patientId || typeof patientId !== "string") {
    return new Response(JSON.stringify({ error: "patient_id_required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const horizon = Math.min(30, Math.max(1, body.horizon_days ?? 7));

  const sb = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  /** Mesma regra que o RLS em `patients`: staff só com vínculo aprovado em patient_hospital_links. */
  const { data: canAccess, error: linkErr } = await sb.rpc("staff_has_approved_patient_link", {
    p_patient_id: patientId,
  });
  if (linkErr) {
    return new Response(JSON.stringify({ error: "link_check_failed", message: linkErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!canAccess) {
    return new Response(
      JSON.stringify({
        error: "no_approved_patient_link",
        message:
          "Sem vínculo aprovado com este paciente. Aprove o acesso em Autorizações ou confirme o vínculo hospital–paciente.",
      }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured", message: "SUPABASE_SERVICE_ROLE_KEY em falta na função." }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: patientRaw, error: pErr } = await admin
    .from("patients")
    .select("id, hospital_id, care_phase, profiles!patients_profile_id_fkey ( full_name )")
    .eq("id", patientId)
    .maybeSingle();
  if (pErr || !patientRaw) {
    return new Response(JSON.stringify({ error: "patient_not_found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const profileData = patientRaw.profiles as { full_name?: string | null } | { full_name?: string | null }[] | null;
  const profileRow = Array.isArray(profileData) ? profileData[0] : profileData;
  const patient = { ...patientRaw, full_name: profileRow?.full_name ?? null };

  const since = new Date();
  since.setDate(since.getDate() - horizon);
  const sinceIso = since.toISOString();

  const [symptoms, vitals, biomarkers, medLogs] = await Promise.all([
    admin.from("symptom_logs").select("logged_at, symptom_key, severity, notes").eq("patient_id", patientId).gte("logged_at", sinceIso).order("logged_at", { ascending: false }).limit(80),
    admin.from("vital_logs").select("logged_at, temperature_c, heart_rate, spo2, weight_kg").eq("patient_id", patientId).gte("logged_at", sinceIso).order("logged_at", { ascending: false }).limit(80),
    admin.from("biomarker_logs").select("logged_at, name, value_numeric, unit, is_critical").eq("patient_id", patientId).gte("logged_at", sinceIso).order("logged_at", { ascending: false }).limit(40),
    admin.from("medication_logs").select("logged_at, taken, medication_name").eq("patient_id", patientId).gte("logged_at", sinceIso).order("logged_at", { ascending: false }).limit(120),
  ]);

  const symRows = symptoms.data ?? [];
  const vitRows = vitals.data ?? [];
  const bioRows = biomarkers.data ?? [];
  const medRows = medLogs.data ?? [];
  const taken = medRows.filter((m) => m.taken === true).length;
  const scheduled = medRows.length || 1;
  const adherencePct = Math.round((taken / scheduled) * 100);

  const criticalLabs = bioRows.filter((b) => b.is_critical);

  let aiBlock = "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  const compact = JSON.stringify({
    patient: patient.full_name,
    care_phase: patient.care_phase,
    horizon_days: horizon,
    symptoms: symRows.slice(0, 15),
    vitals_summary: vitRows.slice(0, 5),
    biomarkers: bioRows.slice(0, 10),
    adherence_pct: adherencePct,
    critical_labs: criticalLabs,
  });

  if (openaiKey) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Você é assistente clínico. Resuma evolução em português (Brasil), tom profissional, 3–5 parágrafos curtos, sem diagnóstico definitivo, cite tendências e riscos. Não invente dados fora do JSON.",
            },
            { role: "user", content: compact },
          ],
          temperature: 0.3,
          max_tokens: 900,
        }),
      });
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      const text = j.choices?.[0]?.message?.content?.trim();
      if (text) aiBlock = `<section class="ai"><h2>Evolução assistida (IA)</h2><p>${esc(text).replace(/\n/g, "</p><p>")}</p></section>`;
    } catch {
      /* ignore */
    }
  } else if (anthropicKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 900,
          messages: [
            {
              role: "user",
              content: `Resuma a evolução clínica em PT-BR com base apenas neste JSON:\n${compact}`,
            },
          ],
          system:
            "Assistente clínico: 3–5 parágrafos curtos, tom profissional, sem diagnóstico definitivo. Use apenas o JSON fornecido.",
        }),
      });
      const j = (await r.json()) as { content?: { text?: string }[] };
      const text = j.content?.[0]?.text?.trim();
      if (text) aiBlock = `<section class="ai"><h2>Evolução assistida (IA)</h2><p>${esc(text).replace(/\n/g, "</p><p>")}</p></section>`;
    } catch {
      /* ignore */
    }
  }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Relatório de evolução</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:880px;margin:24px auto;padding:0 16px;color:#0f172a;background:#f8fafc;}
h1{font-size:1.35rem;border-bottom:2px solid #0d9488;padding-bottom:8px;}
h2{font-size:1.05rem;margin-top:20px;color:#134e4a;}
table{width:100%;border-collapse:collapse;font-size:0.9rem;}
th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;}
th{background:#ecfeff;}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#ccfbf1;font-size:0.75rem;}
.ai p{line-height:1.5;}
</style></head><body>
<h1>Relatório de evolução — ${esc(String(patient.full_name ?? "Paciente"))}</h1>
<p><span class="badge">Janela: ${horizon} dias</span> <span class="badge">Fase: ${esc(String(patient.care_phase ?? "—"))}</span></p>
${aiBlock || "<p><em>Configure OPENAI_API_KEY ou ANTHROPIC_API_KEY no projeto para resumo com IA; abaixo segue o quadro objetivo.</em></p>"}
<section><h2>Resumo objetivo</h2>
<ul>
<li>Registros de sintomas: ${symRows.length}</li>
<li>Registros de vitais: ${vitRows.length}</li>
<li>Aderência medicamentosa (aprox.): ${adherencePct}% (${taken}/${scheduled} logs)</li>
<li>Biomarcadores críticos no período: ${criticalLabs.length}</li>
</ul></section>
<section><h2>Sintomas recentes</h2>
<table><thead><tr><th>Data</th><th>Sintoma</th><th>Severidade</th></tr></thead><tbody>
${symRows
  .slice(0, 25)
  .map(
    (s) =>
      `<tr><td>${esc(String(s.logged_at ?? ""))}</td><td>${esc(String(s.symptom_key ?? ""))}</td><td>${esc(String(s.severity ?? ""))}</td></tr>`
  )
  .join("")}
</tbody></table></section>
<section><h2>Biomarcadores</h2>
<table><thead><tr><th>Data</th><th>Nome</th><th>Valor</th><th>Crítico</th></tr></thead><tbody>
${bioRows
  .map(
    (b) =>
      `<tr><td>${esc(String(b.logged_at ?? ""))}</td><td>${esc(String(b.name ?? ""))}</td><td>${esc(String(b.value_numeric ?? ""))} ${esc(String(b.unit ?? ""))}</td><td>${b.is_critical ? "Sim" : "—"}</td></tr>`
  )
  .join("")}
</tbody></table></section>
<p style="margin-top:32px;font-size:0.8rem;color:#64748b;">Gerado automaticamente · não substitui avaliação médica · ${new Date().toISOString()}</p>
</body></html>`;

  return new Response(JSON.stringify({ html, meta: { horizon_days: horizon, patient_id: patientId } }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
