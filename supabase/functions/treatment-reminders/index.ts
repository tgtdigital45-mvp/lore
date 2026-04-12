/**
 * Cron (ex.: diário): lembretes por push Expo para sessões agendadas (dia anterior e no próprio dia).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (Authorization: Bearer <CRON_SECRET>)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronAuth } from "../_shared/cronAuth.ts";

type InfusionRow = {
  id: string;
  patient_id: string;
  cycle_id: string;
  session_at: string;
  status: string;
};

type CycleRow = { id: string; protocol_name: string };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function utcYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Returns YMD that is `days` before `ymd` (UTC calendar). */
function addCalendarDaysYmd(ymd: string, days: number): string {
  const [y, mo, day] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return utcYmd(dt);
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

  const { error: nadirErr } = await sb.rpc("refresh_all_patients_nadir_flags");
  if (nadirErr) {
    console.error("treatment-reminders: refresh_all_patients_nadir_flags", nadirErr.message);
  }

  const todayYmd = utcYmd(new Date());

  const { data: infusions, error: iErr } = await sb
    .from("treatment_infusions")
    .select("id, patient_id, cycle_id, session_at, status")
    .eq("status", "scheduled");

  if (iErr || !infusions) {
    console.error("treatment-reminders: infusions query failed", iErr?.message);
    return new Response(JSON.stringify({ error: "query_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const list = infusions as InfusionRow[];
  if (list.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, checked: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const cycleIds = [...new Set(list.map((i) => i.cycle_id))];
  const { data: cycles } = await sb.from("treatment_cycles").select("id, protocol_name").in("id", cycleIds);
  const protocolByCycle = new Map((cycles as CycleRow[] | null)?.map((c) => [c.id, c.protocol_name]) ?? []);

  const { data: patients } = await sb.from("patients").select("id, profile_id");
  const profileByPatient = new Map((patients ?? []).map((p: { id: string; profile_id: string }) => [p.id, p.profile_id]));

  const { data: profiles } = await sb.from("profiles").select("id, expo_push_token").not("expo_push_token", "is", null);
  const tokenByProfile = new Map((profiles ?? []).map((p: { id: string; expo_push_token: string }) => [p.id, p.expo_push_token]));

  type WorkItem = { raw: InfusionRow; kind: "day_before" | "same_day" };
  const work: WorkItem[] = [];

  for (const raw of list) {
    const sessionYmd = utcYmd(new Date(raw.session_at));
    const dayBeforeYmd = addCalendarDaysYmd(sessionYmd, -1);

    const kinds: { kind: "day_before" | "same_day"; fire: boolean }[] = [
      { kind: "day_before", fire: todayYmd === dayBeforeYmd },
      { kind: "same_day", fire: todayYmd === sessionYmd },
    ];

    for (const { kind, fire } of kinds) {
      if (!fire) continue;
      work.push({ raw, kind });
    }
  }

  const infusionIds = [...new Set(work.map((w) => w.raw.id))];
  let dupSet = new Set<string>();
  if (infusionIds.length > 0) {
    const { data: dupRows } = await sb
      .from("treatment_reminder_dispatches")
      .select("infusion_id, reminder_kind")
      .in("infusion_id", infusionIds);
    dupSet = new Set(
      (dupRows ?? []).map((r: { infusion_id: string; reminder_kind: string }) => `${r.infusion_id}|${r.reminder_kind}`)
    );
  }

  let sent = 0;

  for (const { raw, kind } of work) {
    const dupKey = `${raw.id}|${kind}`;
    if (dupSet.has(dupKey)) continue;

    const profileId = profileByPatient.get(raw.patient_id);
    const token = profileId ? tokenByProfile.get(profileId) : undefined;
    if (!token) continue;

    const protocol = protocolByCycle.get(raw.cycle_id) ?? "Tratamento";
    const title = "Sessão de tratamento";
    const body =
      kind === "day_before"
        ? `Amanhã tens uma sessão (${protocol}) agendada.`
        : `Hoje é dia de sessão (${protocol}). Faz o check-in na app.`;

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
        data: { infusionId: raw.id, cycleId: raw.cycle_id, reminderKind: kind },
      }),
    });
    if (!pushRes.ok) continue;

    await sb.from("treatment_reminder_dispatches").insert({
      infusion_id: raw.id,
      reminder_kind: kind,
    });
    dupSet.add(dupKey);
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, sent, checked: list.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
