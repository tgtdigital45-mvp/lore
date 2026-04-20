/**
 * Dispara lembrete de questionário PRO (QoL) — integração WhatsApp/Twilio opcional.
 * Auth: CRON_SECRET (agendado) ou JWT staff com papel hospital_admin/doctor.
 * Body: { patient_id: string, questionnaire_type?: string, phone_e164?: string }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }

  let body: { patient_id?: string; questionnaire_type?: string; phone_e164?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

  let allowed = isCron;
  if (!allowed && authHeader) {
    const sbUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await sbUser.auth.getUser();
    const roleMeta = (u.user?.user_metadata as { role?: string } | undefined)?.role;
    const { data: prof } = await sbUser.from("profiles").select("role").eq("id", u.user?.id ?? "").maybeSingle();
    const r = prof?.role ?? roleMeta;
    allowed = r === "hospital_admin" || r === "doctor";
  }

  if (!allowed) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const pid = body.patient_id;
  if (!pid) {
    return new Response(JSON.stringify({ error: "patient_id_required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const sb = createClient(url, serviceKey);
  const { data: patient } = await sb.from("patients").select("id, full_name, phone").eq("id", pid).maybeSingle();
  if (!patient) {
    return new Response(JSON.stringify({ error: "patient_not_found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const qType = body.questionnaire_type ?? "EORTC_QLQ_C30";
  const phone = body.phone_e164?.trim() || (patient as { phone?: string }).phone?.trim();
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")?.trim();
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")?.trim();
  const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM")?.trim();

  const message = `Olá ${(patient as { full_name?: string }).full_name ?? ""}, por favor responda ao questionário de qualidade de vida (${qType}) no app Aura Onco. Obrigado.`;

  if (!phone || !twilioSid || !twilioToken || !twilioFrom) {
    return new Response(
      JSON.stringify({
        ok: true,
        dispatched: false,
        reason: "whatsapp_not_configured",
        hint: "Defina TWILIO_* e phone no paciente ou phone_e164 no body",
        preview_message: message,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const to = phone.startsWith("+") ? `whatsapp:${phone}` : `whatsapp:+${phone.replace(/\D/g, "")}`;
  const form = new URLSearchParams();
  form.set("From", twilioFrom);
  form.set("To", to);
  form.set("Body", message);

  const tw = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!tw.ok) {
    const errText = await tw.text();
    return new Response(JSON.stringify({ ok: false, error: "twilio_failed", detail: errText.slice(0, 500) }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const twJson = (await tw.json()) as { sid?: string };
  return new Response(JSON.stringify({ ok: true, dispatched: true, message_sid: twJson.sid }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
