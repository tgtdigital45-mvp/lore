import type { NutritionLogRow, WearableSampleRow } from "@/types/dashboard";

const ACTIVITY_METRICS = new Set([
  "steps",
  "active_energy",
  "exercise_time",
  "distance_walking_running",
  "stand_hours",
]);

/**
 * Adesão estimada nos últimos `daysWindow` dias: % de dias com pelo menos um registo de nutrição
 * e % de dias com amostra de atividade (wearables).
 */
export function computeNutritionActivityAdherence(
  nutritionLogs: NutritionLogRow[],
  wearables: WearableSampleRow[],
  daysWindow = 14
): { dietPct: number; exercisePct: number; dietDays: number; exerciseDays: number; totalDays: number } {
  const endMs = Date.now();
  const startMs = endMs - daysWindow * 86_400_000;
  const totalDays = daysWindow;

  const dietDays = new Set<string>();
  for (const n of nutritionLogs) {
    const t = new Date(n.logged_at).getTime();
    if (t >= startMs && t <= endMs) {
      dietDays.add(new Date(n.logged_at).toISOString().slice(0, 10));
    }
  }

  const exerciseDays = new Set<string>();
  for (const w of wearables) {
    const t = new Date(w.observed_start).getTime();
    if (t >= startMs && t <= endMs && ACTIVITY_METRICS.has(w.metric)) {
      exerciseDays.add(new Date(w.observed_start).toISOString().slice(0, 10));
    }
  }

  const dietPct = Math.min(100, Math.round((dietDays.size / totalDays) * 100));
  const exercisePct = Math.min(100, Math.round((exerciseDays.size / totalDays) * 100));

  return {
    dietPct,
    exercisePct,
    dietDays: dietDays.size,
    exerciseDays: exerciseDays.size,
    totalDays,
  };
}
