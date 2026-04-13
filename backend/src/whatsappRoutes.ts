import type { Express, Request, Response } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { z } from "zod";
import type { Env } from "./config.js";
import { authenticateBearer } from "./authMiddleware.js";
import { idempotencyMiddleware } from "./idempotencyMiddleware.js";
import { logStructured } from "./logger.js";
import { verifyMetaXHubSignature256 } from "./metaWebhookSignature.js";
import { createServiceSupabase } from "./supabase.js";

const sendBody = z.object({
  patient_id: z.string().uuid(),
  message: z.string().min(1).max(4096),
  symptom_log_id: z.string().uuid().optional(),
});

function digitsOnly(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15 ? d : null;
}

function profileFromPatientRow(profiles: unknown): {
  phone_e164: string | null;
  whatsapp_opt_in_at: string | null;
  whatsapp_opt_in_revoked_at: string | null;
} {
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!p || typeof p !== "object") {
    return { phone_e164: null, whatsapp_opt_in_at: null, whatsapp_opt_in_revoked_at: null };
  }
  const o = p as Record<string, unknown>;
  return {
    phone_e164: typeof o.phone_e164 === "string" ? o.phone_e164 : null,
    whatsapp_opt_in_at: typeof o.whatsapp_opt_in_at === "string" ? o.whatsapp_opt_in_at : null,
    whatsapp_opt_in_revoked_at: typeof o.whatsapp_opt_in_revoked_at === "string" ? o.whatsapp_opt_in_revoked_at : null,
  };
}

function hasOptIn(p: { whatsapp_opt_in_at: string | null; whatsapp_opt_in_revoked_at: string | null }): boolean {
  return p.whatsapp_opt_in_at != null && p.whatsapp_opt_in_revoked_at == null;
}

function mapMetaStatus(s: string): "sent" | "delivered" | "read" | "failed" {
  const x = s.toLowerCase();
  if (x === "sent") return "sent";
  if (x === "delivered") return "delivered";
  if (x === "read") return "read";
  if (x === "failed") return "failed";
  return "sent";
}

async function processWebhookPayload(env: Env, body: unknown) {
  const admin = createServiceSupabase(env);
  if (!admin) return;
  const entries = (body as { entry?: unknown[] })?.entry ?? [];
  for (const ent of entries) {
    const changes = (ent as { changes?: unknown[] })?.changes ?? [];
    for (const ch of changes) {
      const statuses = (ch as { value?: { statuses?: { id?: string; status?: string }[] } })?.value?.statuses ?? [];
      for (const st of statuses) {
        const id = st.id;
        const status = st.status;
        if (!id || !status) continue;
        const mapped = mapMetaStatus(status);
        await admin
          .from("outbound_messages")
          .update({ status: mapped, updated_at: new Date().toISOString() })
          .eq("provider_message_id", id);
      }
    }
  }
}

export function mountWhatsappRoutes(app: Express, env: Env, limiter: RateLimitRequestHandler) {
  const requireUser = authenticateBearer(env);

  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    if (!env.WHATSAPP_VERIFY_TOKEN) {
      res.status(503).json({ error: "whatsapp_webhook_not_configured" });
      return;
    }
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && typeof challenge === "string") {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send("Forbidden");
  });

  app.post("/api/whatsapp/webhook", (req: Request, res: Response) => {
    if (!env.WHATSAPP_APP_SECRET) {
      logStructured("whatsapp_webhook_reject", { reason: "missing_whatsapp_app_secret" });
      res.status(503).json({ error: "whatsapp_signature_not_configured" });
      return;
    }
    const raw = req.rawBody;
    if (!raw || raw.length === 0) {
      logStructured("whatsapp_webhook_reject", { reason: "missing_raw_body" });
      res.status(400).json({ error: "missing_body" });
      return;
    }
    const sig = req.headers["x-hub-signature-256"];
    if (!verifyMetaXHubSignature256(raw, sig, env.WHATSAPP_APP_SECRET)) {
      logStructured("whatsapp_webhook_reject", { reason: "invalid_signature" });
      res.status(403).json({ error: "invalid_signature" });
      return;
    }
    res.status(200).json({ received: true });
    void processWebhookPayload(env, req.body).catch((e) => {
      logStructured("whatsapp_webhook_process_error", { message: e instanceof Error ? e.message : String(e) });
    });
  });

  app.post("/api/whatsapp/send", limiter, idempotencyMiddleware(), requireUser, async (req: Request, res: Response) => {
    const parsed = sendBody.safeParse(req.body);
    if (!parsed.success) {
      logStructured("validation_error", { route: "whatsapp_send", details: parsed.error.flatten() });
      res.status(400).json({
        error: "invalid_request",
        message: "Requisição inválida. Verifique os campos enviados.",
      });
      return;
    }

    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      res.status(503).json({ error: "whatsapp_not_configured" });
      return;
    }

    const admin = createServiceSupabase(env);
    if (!admin) {
      res.status(503).json({ error: "service_role_not_configured" });
      return;
    }

    const supabase = req.authUser!.supabase;
    const userId = req.authUser!.userId;
    const { patient_id: patientId, message, symptom_log_id: symptomLogId } = parsed.data;

    if (symptomLogId) {
      const { data: sl, error: slErr } = await supabase
        .from("symptom_logs")
        .select("id")
        .eq("id", symptomLogId)
        .eq("patient_id", patientId)
        .maybeSingle();
      if (slErr || !sl) {
        res.status(400).json({ error: "invalid_symptom_log", message: "Sintoma não pertence a este paciente." });
        return;
      }
    }

    const { data: patientRow, error: pErr } = await supabase
      .from("patients")
      .select("id, hospital_id, profiles!patients_profile_id_fkey ( phone_e164, whatsapp_opt_in_at, whatsapp_opt_in_revoked_at )")
      .eq("id", patientId)
      .single();

    if (pErr || !patientRow) {
      res.status(404).json({ error: "patient_not_found" });
      return;
    }

    const hospitalId = patientRow.hospital_id as string;
    const prof = profileFromPatientRow(patientRow.profiles);

    const { data: assign, error: aErr } = await supabase
      .from("staff_assignments")
      .select("id")
      .eq("staff_id", userId)
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    if (aErr || !assign) {
      res.status(403).json({ error: "not_authorized_for_hospital" });
      return;
    }

    if (!hasOptIn(prof)) {
      res.status(403).json({ error: "whatsapp_opt_in_required", message: "Paciente sem consentimento ativo para WhatsApp." });
      return;
    }

    const to = digitsOnly(prof.phone_e164);
    if (!to) {
      res.status(400).json({ error: "missing_phone_e164", message: "Cadastre telefone E.164 no perfil do paciente." });
      return;
    }

    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    let graphJson: { error?: { message?: string }; messages?: { id?: string }[] } = {};
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      });
      graphJson = (await r.json()) as typeof graphJson;
      if (!r.ok) {
        const detail = graphJson.error?.message ?? r.statusText;
        logStructured("whatsapp_api_error", { detail: detail.slice(0, 500), status: r.status });
        await admin.from("outbound_messages").insert({
          patient_id: patientId,
          hospital_id: hospitalId,
          actor_id: userId,
          channel: "whatsapp",
          body: message,
          status: "failed",
          error_detail: detail.slice(0, 2000),
          metadata: { graph_status: r.status },
          symptom_log_id: symptomLogId ?? null,
        });
        res.status(502).json({
          error: "whatsapp_send_failed",
          message: "Não foi possível enviar a mensagem. Tente novamente.",
        });
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logStructured("whatsapp_network_error", { detail: msg.slice(0, 500) });
      await admin.from("outbound_messages").insert({
        patient_id: patientId,
        hospital_id: hospitalId,
        actor_id: userId,
        channel: "whatsapp",
        body: message,
        status: "failed",
        error_detail: msg.slice(0, 2000),
        metadata: {},
        symptom_log_id: symptomLogId ?? null,
      });
      res.status(502).json({
        error: "whatsapp_network_error",
        message: "Não foi possível enviar a mensagem. Tente novamente.",
      });
      return;
    }

    const wamid = graphJson.messages?.[0]?.id ?? null;

    const { data: inserted, error: insErr } = await admin
      .from("outbound_messages")
      .insert({
        patient_id: patientId,
        hospital_id: hospitalId,
        actor_id: userId,
        channel: "whatsapp",
        body: message,
        status: "sent",
        provider_message_id: wamid,
        metadata: symptomLogId ? { symptom_log_id: symptomLogId } : {},
        symptom_log_id: symptomLogId ?? null,
      })
      .select("id")
      .single();

    if (insErr) {
      logStructured("whatsapp_outbound_insert_failed", { err: insErr.message });
    }

    const { error: auditErr } = await supabase.rpc("record_audit", {
      p_target_patient_id: patientId,
      p_action: "WHATSAPP_OUTBOUND",
      p_metadata: { channel: "whatsapp", outbound_id: inserted?.id ?? null },
    });
    if (auditErr) {
      logStructured("whatsapp_record_audit_warn", { message: auditErr.message });
    }

    res.json({ ok: true, provider_message_id: wamid, outbound_id: inserted?.id ?? null });
  });
}
