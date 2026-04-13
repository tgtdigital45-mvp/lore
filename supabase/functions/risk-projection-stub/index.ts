/**
 * Stub para pipeline preditivo: grava `risk_scores` com service role.
 * Produção: substituir por chamada a serviço Python / modelo validado.
 * Auth: CRON_SECRET (igual às outras Edge Functions agendadas).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronAuth } from "../_shared/cronAuth.ts";

Deno.serve(async (req) => {
  const denied = requireCronAuth(req);
  if (denied) return denied;
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: { patient_id?: string; target_ae_slug?: string; probability?: number; horizon_days?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const pid = body.patient_id;
  if (!pid || typeof pid !== "string") {
    return new Response(JSON.stringify({ error: "patient_id_required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const sb = createClient(url, key);
  const probability = typeof body.probability === "number" ? Math.min(1, Math.max(0, body.probability)) : 0.1;
  const { data, error } = await sb
    .from("risk_scores")
    .insert({
      patient_id: pid,
      target_ae_slug: body.target_ae_slug ?? null,
      horizon_days: body.horizon_days ?? 7,
      probability,
      model_version: "stub-0.1.0",
      features_summary: { source: "risk-projection-stub" },
    })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, id: data?.id }), { headers: { "Content-Type": "application/json" } });
});
