import type { MedicationRow } from "@/src/hooks/useMedications";
import { enumerateDoses, nextDoseTime } from "@/src/lib/doseSchedule";
import { parseTimeOfDay } from "@/src/medications/scheduleUtils";
import { ensureNotificationPermissions, loadExpoNotificationsModule } from "@/src/utils/notifications";

const PREFIX = "med-";

export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
  const Notifications = await loadExpoNotificationsModule();
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ids = scheduled.filter((n) => n.identifier.startsWith(`${PREFIX}${medicationId}-`)).map((n) => n.identifier);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

function endOfDayMsFromDateString(isoDate: string): number {
  const d = new Date(isoDate + "T23:59:59");
  return d.getTime();
}

function enumerateSlotDoses(med: MedicationRow, fromMs: number, untilMs: number): Date[] {
  const schedules = med.medication_schedules ?? [];
  if (schedules.length === 0) return [];

  const repeat = med.repeat_mode ?? "interval_hours";
  const weekdays = med.schedule_weekdays;

  const anchorMs = new Date(med.anchor_at).getTime();
  const anchorDay = new Date(med.anchor_at);
  anchorDay.setHours(0, 0, 0, 0);

  const endLimit = med.end_date ? endOfDayMsFromDateString(med.end_date) : untilMs;
  const horizon = Math.min(untilMs, endLimit);

  const fromDay = new Date(fromMs);
  fromDay.setHours(0, 0, 0, 0);
  const startWalkMs = Math.max(anchorDay.getTime(), fromDay.getTime());
  const out: Date[] = [];

  for (let day = new Date(startWalkMs); day.getTime() <= horizon; day.setDate(day.getDate() + 1)) {
    const dow = day.getDay();
    if (repeat === "weekdays" && weekdays && weekdays.length > 0) {
      if (!weekdays.includes(dow)) continue;
    }

    for (const s of schedules) {
      const { hours, minutes } = parseTimeOfDay(s.time_of_day);
      const t = new Date(day);
      t.setHours(hours, minutes, 0, 0);
      const tt = t.getTime();
      if (tt < anchorMs) continue;
      if (tt > fromMs && tt <= horizon) out.push(new Date(tt));
    }
  }

  return out.sort((a, b) => a.getTime() - b.getTime()).slice(0, 64);
}

export async function scheduleMedicationNotifications(med: MedicationRow): Promise<void> {
  if (!med.active) {
    await cancelMedicationNotifications(med.id);
    return;
  }
  const Notifications = await loadExpoNotificationsModule();
  if (!Notifications) return;
  await ensureNotificationPermissions();
  await cancelMedicationNotifications(med.id);

  const mode = med.repeat_mode ?? "interval_hours";
  if (mode === "as_needed") {
    return;
  }

  const now = Date.now();
  const horizon = now + 14 * 86400000;
  const endDateMs = med.end_date ? endOfDayMsFromDateString(med.end_date) : horizon;
  const until = Math.min(horizon, endDateMs);
  const hasSlots = (med.medication_schedules?.length ?? 0) > 0;
  const useSlots = hasSlots && (mode === "daily" || mode === "weekdays");

  let doses: Date[];
  if (useSlots) {
    doses = enumerateSlotDoses(med, now, until);
  } else {
    const anchor = new Date(med.anchor_at).getTime();
    const freq = med.frequency_hours;
    doses = enumerateDoses(anchor, freq, now, until).slice(0, 64);
  }

  let i = 0;
  for (const d of doses) {
    if (d.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${med.id}-${i}`,
      content: {
        title: "Medicamento",
        body: `${med.name}${med.dosage ? ` (${med.dosage})` : ""} — hora da dose`,
        sound: true,
        data: { medicationId: med.id, scheduledTime: d.toISOString() },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d },
    });
    i += 1;
  }
}

export async function rescheduleAllForPatient(meds: MedicationRow[]): Promise<void> {
  for (const m of meds) {
    if (m.active) await scheduleMedicationNotifications(m);
    else await cancelMedicationNotifications(m.id);
  }
}

export function computeNextDose(med: MedicationRow, afterMs: number): Date | null {
  const mode = med.repeat_mode ?? "interval_hours";
  if (mode === "as_needed") return null;
  const hasSlots = (med.medication_schedules?.length ?? 0) > 0;
  const useSlots = hasSlots && (mode === "daily" || mode === "weekdays");

  const endMs = med.end_date ? endOfDayMsFromDateString(med.end_date) : afterMs + 366 * 86400000;

  if (useSlots) {
    const slots = enumerateSlotDoses(med, afterMs, Math.min(afterMs + 120 * 86400000, endMs));
    const next = slots.find((t) => t.getTime() > afterMs);
    return next ?? null;
  }

  const anchor = new Date(med.anchor_at).getTime();
  const t = nextDoseTime(anchor, med.frequency_hours, afterMs);
  if (!t) return null;
  if (t.getTime() > endMs) return null;
  return t;
}

export function nextMedicationSlot(meds: MedicationRow[]): { med: MedicationRow; when: Date } | null {
  const now = Date.now();
  let best: { med: MedicationRow; when: Date } | null = null;
  for (const m of meds) {
    if (!m.active) continue;
    const when = computeNextDose(m, now);
    if (!when) continue;
    if (!best || when.getTime() < best.when.getTime()) best = { med: m, when };
  }
  return best;
}
