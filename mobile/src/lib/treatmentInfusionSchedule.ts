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

/**
 * Após um check-in, recalcula `session_at` das sessões ainda `scheduled` (ordenadas da mais cedo à mais tarde):
 * 1.ª pendente = último check-in + intervalo, 2.ª = +2×intervalo, …
 * Assim, se a infusão for antecipada ou atrasada, as datas previstas seguintes seguem o último registo, não a grelha inicial.
 */
export function reschedulePendingSessionAtsAfterCheckIn(
  completedAtIso: string,
  intervalDays: number,
  scheduledOrderedBySessionAt: Pick<TreatmentInfusionRow, "id">[]
): { id: string; session_at: string }[] {
  if (!Number.isFinite(intervalDays) || intervalDays < 1 || scheduledOrderedBySessionAt.length === 0) return [];
  const anchor = new Date(completedAtIso).getTime();
  if (Number.isNaN(anchor)) return [];
  return scheduledOrderedBySessionAt.map((row, idx) => {
    const d = addDaysUtc(new Date(completedAtIso), (idx + 1) * intervalDays);
    d.setUTCHours(12, 0, 0, 0);
    return { id: row.id, session_at: d.toISOString() };
  });
}

export function formatPtDateShort(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Comparador de dia civil local: data prevista antes de hoje (sessão ainda não confirmada). */
export function isPastPredictedCalendarDay(sessionAtIso: string): boolean {
  const t = new Date(sessionAtIso);
  const n = new Date();
  const ts = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  const ns = n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate();
  return ts < ns;
}

/**
 * Próximo check-in pendente: primeira sessão com status `scheduled`, pela data prevista.
 * Inclui sessões com data já passada (para não saltar o cartão na home).
 */
export function nextPendingScheduledInfusion<T extends Pick<TreatmentInfusionRow, "session_at" | "status">>(
  infusions: T[]
): T | null {
  const pending = infusions
    .filter((i) => i.status === "scheduled")
    .sort((a, b) => new Date(a.session_at).getTime() - new Date(b.session_at).getTime());
  return pending[0] ?? null;
}
