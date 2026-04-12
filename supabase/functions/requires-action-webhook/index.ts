/**
 * Cron: envia webhook assinado para alertas requires_action (sintomas gerais, app ou agente).
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET,
 *          HOSPITAL_ALERT_WEBHOOK_URL, HOSPITAL_ALERT_WEBHOOK_SECRET (opcional se URL vazio)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronAuth } from "../_shared/cronAuth.ts";
import { signHospitalAlertPayload } from "../_shared/hospitalWebhookSign.ts";

Deno.serve(async (req) => {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const hookUrl = Deno.env.get("HOSPITAL_ALERT_WEBHOOK_URL")?.trim();
  const hookSecret = Deno.env.get("HOSPITAL_ALERT_WEBHOOK_SECRET")?.trim();

  if (!url || !key) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!hookUrl || !hookSecret) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "webhook_not_configured" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const sb = createClient(url, key);

  const { data: pending, error: qErr } = await sb
    .from("symptom_logs")
    .select("id, patient_id, hospital_id, logged_at")
    .eq("requires_action", true)
    .not("hospital_id", "is", null)
    .order("logged_at", { ascending: true })
    .limit(50);

  if (qErr || !pending?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0, pending: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const ids = (pending as { id: string }[]).map((r) => r.id);
  const { data: doneRows } = await sb.from("requires_action_webhook_dispatches").select("symptom_log_id").in("symptom_log_id", ids);
  const done = new Set((doneRows ?? []).map((r: { symptom_log_id: string }) => r.symptom_log_id));

  let sent = 0;

  for (const row of pending as {
    id: string;
    patient_id: string;
    hospital_id: string;
    logged_at: string;
    requires_action: boolean;
  }[]) {
    if (done.has(row.id)) continue;

    const payload = {
      type: "REQUIRES_ACTION_SYMPTOM" as const,
      symptom_log_id: row.id,
      patient_id: row.patient_id,
      hospital_id: row.hospital_id,
      ts: row.logged_at,
    };
    const raw = JSON.stringify(payload);
    const sig = await signHospitalAlertPayload(raw, hookSecret);

    try {
      const res = await fetch(hookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": sig,
        },
        body: raw,
      });
      if (!res.ok) continue;
      await sb.from("requires_action_webhook_dispatches").insert({ symptom_log_id: row.id });
      sent += 1;
    } catch {
      /* retry next cron */
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, checked: pending.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
