/**
 * POST { link_id: string }
 * Sends Expo push to the patient when a hospital requests access (pending link).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (Authorization: Bearer <CRON_SECRET>)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronAuth } from "../_shared/cronAuth.ts";

Deno.serve(async (req) => {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { link_id?: string };
  try {
    body = (await req.json()) as { link_id?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const linkId = body.link_id?.trim();
  if (!linkId) {
    return new Response(JSON.stringify({ error: "link_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const sb = createClient(url, key);
  const { data: row, error: qErr } = await sb
    .from("patient_hospital_links")
    .select(
      "id, status, patient_id, hospital_id, hospitals ( name ), patients ( profile_id )"
    )
    .eq("id", linkId)
    .maybeSingle();

  if (qErr) {
    console.error("patient-link-notify: query failed", qErr.message);
    return new Response(JSON.stringify({ error: "query_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!row) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (row.status !== "pending") {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "not pending" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const patients = row.patients as { profile_id: string } | { profile_id: string }[] | null;
  const profileId = Array.isArray(patients) ? patients[0]?.profile_id : patients?.profile_id;
  if (!profileId) {
    return new Response(JSON.stringify({ error: "no profile" }), { status: 422, headers: { "Content-Type": "application/json" } });
  }

  const { data: prof } = await sb.from("profiles").select("expo_push_token").eq("id", profileId).maybeSingle();
  const token = prof?.expo_push_token;
  if (!token) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no push token" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const hospitals = row.hospitals as { name: string } | { name: string }[] | null;
  const hname = Array.isArray(hospitals) ? hospitals[0]?.name : hospitals?.name;
  const title = "Pedido de acesso";
  const bodyText = hname
    ? `${hname} pediu autorização para ver seus dados no Aura. Toque para responder.`
    : "Um hospital pediu autorização para ver seus dados no Aura. Toque para responder.";

  const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      to: token,
      title,
      body: bodyText,
      sound: "default",
      data: { type: "patient_link_request", linkId: row.id },
    }),
  });

  if (!pushRes.ok) {
    const errText = await pushRes.text();
    console.error("patient-link-notify: Expo push failed", pushRes.status, errText.slice(0, 500));
    return new Response(JSON.stringify({ error: "notification_failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, sent: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
