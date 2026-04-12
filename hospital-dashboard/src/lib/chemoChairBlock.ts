/** Bloqueio mínimo para sessão de quimioterapia (4 horas). */
export const CHEMO_SESSION_MS = 4 * 60 * 60 * 1000;

export type ChairBlock = { startMs: number; endMs: number; label?: string };

export function blockFromStart(startMs: number): ChairBlock {
  return { startMs, endMs: startMs + CHEMO_SESSION_MS };
}

export function hasOverlap(candidateStart: number, blocks: ChairBlock[]): boolean {
  const cand = blockFromStart(candidateStart);
  return blocks.some((b) => cand.startMs < b.endMs && cand.endMs > b.startMs);
}

export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function bookingOverlapsExisting(
  resourceId: string,
  candidateStartMs: number,
  candidateEndMs: number,
  bookings: { id: string; resource_id: string; starts_at: string; ends_at: string }[],
  excludeBookingId?: string
): boolean {
  return bookings.some((b) => {
    if (b.resource_id !== resourceId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    const s = Date.parse(b.starts_at);
    const e = Date.parse(b.ends_at);
    return intervalsOverlap(candidateStartMs, candidateEndMs, s, e);
  });
}
