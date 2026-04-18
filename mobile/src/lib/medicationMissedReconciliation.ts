import type { MedicationRow } from "@/src/hooks/useMedications";
import { appStorage } from "@/src/lib/appStorage";
import { enumerateDoseTimesInRange } from "@/src/lib/medicationNotifications";
import { supabase } from "@/src/lib/supabase";

const DAY_KEY = "med_reconcile_no_interaction_day_v1";
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

let reconcileInFlight = false;

function isUniqueViolation(err: { message?: string; code?: string }): boolean {
  const c = err.code ?? "";
  const m = (err.message ?? "").toLowerCase();
  return c === "23505" || m.includes("duplicate") || m.includes("unique");
}

/**
 * Para janelas já passadas sem registo, cria linha `no_interaction` (no máx. 1x por dia civil por dispositivo).
 */
export async function reconcileMissedDoseSlots(medications: MedicationRow[]): Promise<void> {
  if (reconcileInFlight) return;
  reconcileInFlight = true;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const last = await appStorage.getItem(DAY_KEY);
    if (last === today) return;

    const now = Date.now();
    const fromMs = now - LOOKBACK_MS;

    for (const med of medications) {
      if (!med.active) continue;
      if (med.repeat_mode === "as_needed") continue;

      const slots = enumerateDoseTimesInRange(med, fromMs, now);
      for (const slot of slots) {
        if (slot.getTime() >= now) continue;
        const iso = slot.toISOString();
        const { error } = await supabase.from("medication_logs").insert({
          patient_id: med.patient_id,
          medication_id: med.id,
          scheduled_time: iso,
          taken_time: null,
          status: "no_interaction",
          quantity: 1,
        });
        if (error && !isUniqueViolation(error)) {
          console.warn("[reconcileMissedDoseSlots]", med.id, error.message);
        }
      }
    }

    await appStorage.setItem(DAY_KEY, today);
  } finally {
    reconcileInFlight = false;
  }
}
