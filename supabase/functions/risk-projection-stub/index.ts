/**
 * Projeção de risco: heurística sobre sintomas, medicação e histórico de risk_scores.
 * Auth: CRON_SECRET (igual às outras Edge Functions agendadas).
 * Body opcional: patient_id, target_ae_slug, probability (override), horizon_days
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronAuth } from "../_shared/cronAuth.ts";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

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
  const horizon = body.horizon_days ?? 7;
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceIso = since.toISOString();

  const [symptoms, meds, risks] = await Promise.all([
    sb.from("symptom_logs").select("severity").eq("patient_id", pid).gte("logged_at", sinceIso),
    sb.from("medication_logs").select("taken").eq("patient_id", pid).gte("logged_at", sinceIso),
    sb.from("risk_scores").select("probability").eq("patient_id", pid).order("created_at", { ascending: false }).limit(5),
  ]);

  const symRows = symptoms.data ?? [];
  const medRows = meds.data ?? [];
  const riskRows = risks.data ?? [];

  const g3p = symRows.filter((s) => {
    const raw = s.severity as unknown;
    if (typeof raw === "number") return raw >= 3;
    const sev = String(raw ?? "").toUpperCase();
    return sev.includes("3") || sev.includes("4") || sev === "G3" || sev === "G4";
  }).length;

  const totalSym = symRows.length || 1;
  const severeRatio = Math.min(1, g3p / Math.max(8, totalSym * 0.25));

  const taken = medRows.filter((m) => m.taken === true).length;
  const missedRatio = medRows.length ? 1 - taken / medRows.length : 0;

  const lastRisk = riskRows[0]?.probability;
  const prior = typeof lastRisk === "number" && !Number.isNaN(lastRisk) ? lastRisk : 0.12;

  let probability =
    typeof body.probability === "number"
      ? clamp(body.probability, 0, 1)
      : clamp(0.08 + severeRatio * 0.35 + missedRatio * 0.25 + prior * 0.2, 0.03, 0.95);

  const features_summary = {
    source: "risk-projection-heuristic",
    window_days: 14,
    symptom_logs: symRows.length,
    g3_plus_events: g3p,
    medication_logs: medRows.length,
    missed_dose_ratio: Math.round(missedRatio * 100) / 100,
    prior_risk_mean: typeof lastRisk === "number" ? lastRisk : null,
  };

  const { data, error } = await sb
    .from("risk_scores")
    .insert({
      patient_id: pid,
      target_ae_slug: body.target_ae_slug ?? null,
      horizon_days: horizon,
      probability,
      model_version: "heuristic-0.2.0",
      features_summary,
    })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, id: data?.id, probability, features_summary }), {
    headers: { "Content-Type": "application/json" },
  });
});
