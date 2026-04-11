import type { TreatmentInfusionRow } from "@/src/types/treatment";

export function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Parse `YYYY-MM-DD` as UTC noon (stable across timezones for calendar dates). */
export function parseDateOnlyUtcNoon(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
}

/**
 * Planned session timestamp for slot `sessionIndex` (0-based): start date + index * interval days, at UTC noon.
 * Returns null if the start date is invalid, or if `sessionIndex > 0` but `intervalDays` is missing or &lt; 1.
 */
export function predictedSessionAtIso(
  startDateYmd: string,
  sessionIndex: number,
  intervalDays: number | null | undefined
): string | null {
  const base = parseDateOnlyUtcNoon(startDateYmd);
  if (Number.isNaN(base.getTime())) return null;
  if (sessionIndex > 0 && (intervalDays == null || intervalDays < 1)) return null;
  const d = addDaysUtc(base, sessionIndex * (intervalDays ?? 0));
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Próxima data sugerida = última infusão concluída + intervalo (dias). */
export function nextSuggestedInfusionDate(
  intervalDays: number | null | undefined,
  infusions: Pick<TreatmentInfusionRow, "session_at" | "status">[]
): Date | null {
  if (intervalDays == null || intervalDays < 1) return null;
  const completedTimes = infusions
    .filter((i) => i.status === "completed")
    .map((i) => new Date(i.session_at).getTime())
    .filter((t) => !Number.isNaN(t));
  if (completedTimes.length === 0) return null;
  const last = new Date(Math.max(...completedTimes));
  return addDaysUtc(last, intervalDays);
}

export function formatPtDateShort(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
