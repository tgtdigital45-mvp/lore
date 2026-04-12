/**
 * Cron: lembretes push para consultas/exames (dia anterior e no próprio dia).
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (Authorization: Bearer)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronAuth } from "../_shared/cronAuth.ts";

type ApptRow = {
  id: string;
  patient_id: string;
  title: string;
  kind: string;
  starts_at: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function utcYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

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
  const todayYmd = utcYmd(new Date());

  const now = new Date();
  const winStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
  const winEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2, 23, 59, 59));

  const { data: appts, error: aErr } = await sb
    .from("patient_appointments")
    .select("id, patient_id, title, kind, starts_at")
    .gte("starts_at", winStart.toISOString())
    .lte("starts_at", winEnd.toISOString());

  if (aErr || !appts) {
    console.error("appointment-reminders: query failed", aErr?.message);
    return new Response(JSON.stringify({ error: "query_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const list = appts as ApptRow[];
  if (list.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, checked: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: patients } = await sb.from("patients").select("id, profile_id");
  const profileByPatient = new Map((patients ?? []).map((p: { id: string; profile_id: string }) => [p.id, p.profile_id]));

  const { data: profiles } = await sb.from("profiles").select("id, expo_push_token").not("expo_push_token", "is", null);
  const tokenByProfile = new Map((profiles ?? []).map((p: { id: string; expo_push_token: string }) => [p.id, p.expo_push_token]));

  type WorkItem = { raw: ApptRow; kind: "day_before" | "same_day" };
  const work: WorkItem[] = [];

  for (const raw of list) {
    const sessionYmd = utcYmd(new Date(raw.starts_at));
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

  const apptIds = [...new Set(work.map((w) => w.raw.id))];
  let dupSet = new Set<string>();
  if (apptIds.length > 0) {
    const { data: dupRows } = await sb
      .from("appointment_reminder_dispatches")
      .select("appointment_id, reminder_kind")
      .in("appointment_id", apptIds);
    dupSet = new Set(
      (dupRows ?? []).map((r: { appointment_id: string; reminder_kind: string }) => `${r.appointment_id}|${r.reminder_kind}`)
    );
  }

  let sent = 0;

  for (const { raw, kind } of work) {
    const dupKey = `${raw.id}|${kind}`;
    if (dupSet.has(dupKey)) continue;

    const profileId = profileByPatient.get(raw.patient_id);
    const token = profileId ? tokenByProfile.get(profileId) : undefined;
    if (!token) continue;

    const kindPt = raw.kind === "exam" ? "exame" : raw.kind === "consult" ? "consulta" : "compromisso";
    const title = "Consulta / exame";
    const body =
      kind === "day_before"
        ? `Amanhã tens ${kindPt}: ${raw.title}.`
        : `Hoje: ${raw.title} (${kindPt}).`;

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: "default",
        data: { appointmentId: raw.id, reminderKind: kind },
      }),
    });
    if (!pushRes.ok) continue;

    await sb.from("appointment_reminder_dispatches").insert({
      appointment_id: raw.id,
      reminder_kind: kind,
    });
    dupSet.add(dupKey);
    sent += 1;
  }

  return new Response(JSON.stringify({ ok: true, sent, checked: list.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
