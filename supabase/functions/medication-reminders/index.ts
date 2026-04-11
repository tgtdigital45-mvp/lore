/**
 * Cron (ex.: a cada 15 min): lembretes por push Expo para doses nos próximos minutos.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (Authorization: Bearer <CRON_SECRET>)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronAuth } from "../_shared/cronAuth.ts";

type Medication = {
  id: string;
  patient_id: string;
  anchor_at: string;
  frequency_hours: number;
  end_date: string | null;
  active: boolean;
  name: string;
  dosage: string | null;
};

function nextDoseAfter(anchorMs: number, frequencyHours: number, afterMs: number): Date | null {
  const step = frequencyHours * 3600 * 1000;
  if (!Number.isFinite(step) || step <= 0) return null;
  let t = anchorMs;
  let i = 0;
  while (t < afterMs && i < 10000) {
    t += step;
    i += 1;
  }
  if (i >= 10000) return null;
  return new Date(t);
}

Deno.serve(async (req) => {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  if (req.method !== "POST" && req.method !== "GET") {
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

  const sb = createClient(url, key);
  const now = Date.now();
  const windowEnd = now + 20 * 60 * 1000;

  const { data: meds, error: mErr } = await sb
    .from("medications")
    .select("id, patient_id, anchor_at, frequency_hours, end_date, active, name, dosage")
    .eq("active", true);

  if (mErr || !meds) {
    console.error("medication-reminders: meds query failed", mErr?.message);
    return new Response(JSON.stringify({ error: "query_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: patients } = await sb.from("patients").select("id, profile_id");
  const profileByPatient = new Map((patients ?? []).map((p: { id: string; profile_id: string }) => [p.id, p.profile_id]));

  const { data: profiles } = await sb.from("profiles").select("id, expo_push_token").not("expo_push_token", "is", null);
  const tokenByProfile = new Map((profiles ?? []).map((p: { id: string; expo_push_token: string }) => [p.id, p.expo_push_token]));

  type Candidate = { raw: Medication; slot: Date };
  const candidates: Candidate[] = [];

  for (const raw of meds as Medication[]) {
    const profileId = profileByPatient.get(raw.patient_id);
    const token = profileId ? tokenByProfile.get(profileId) : undefined;
    if (!token) continue;

    const anchor = new Date(raw.anchor_at).getTime();
    const endMs = raw.end_date ? new Date(raw.end_date + "T23:59:59").getTime() : now + 366 * 86400000;
    const slot = nextDoseAfter(anchor, raw.frequency_hours, now);
    if (!slot) continue;
    const t = slot.getTime();
    if (t < now || t > windowEnd || t > endMs) continue;
    candidates.push({ raw, slot });
  }

  const medIds = [...new Set(candidates.map((c) => c.raw.id))];
  let existingSet = new Set<string>();
  if (medIds.length > 0) {
    const { data: existingRows } = await sb
      .from("medication_reminder_dispatches")
      .select("medication_id, scheduled_time")
      .in("medication_id", medIds);
    existingSet = new Set(
      (existingRows ?? []).map(
        (r: { medication_id: string; scheduled_time: string }) => `${r.medication_id}|${r.scheduled_time}`
      )
    );
  }

  let sent = 0;
  for (const { raw, slot } of candidates) {
    const pairKey = `${raw.id}|${slot.toISOString()}`;
    if (existingSet.has(pairKey)) continue;

    const profileId = profileByPatient.get(raw.patient_id);
    const token = profileId ? tokenByProfile.get(profileId) : undefined;
    if (!token) continue;

    const body = {
      to: token,
      title: "Medicamento",
      body: `${raw.name}${raw.dosage ? ` (${raw.dosage})` : ""} — hora da dose`,
      sound: "default",
      data: { medicationId: raw.id, scheduledTime: slot.toISOString() },
    };

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!pushRes.ok) continue;

    await sb.from("medication_reminder_dispatches").insert({
      medication_id: raw.id,
      scheduled_time: slot.toISOString(),
    });
    existingSet.add(pairKey);
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, sent, checked: (meds as unknown[]).length }), {
    headers: { "Content-Type": "application/json" },
  });
});
