/** Próximas doses a partir de âncora e intervalo (horas). */

export function nextDoseTime(anchorMs: number, frequencyHours: number, afterMs: number): Date | null {
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

export function enumerateDoses(
  anchorMs: number,
  frequencyHours: number,
  fromMs: number,
  untilMs: number
): Date[] {
  const out: Date[] = [];
  const step = frequencyHours * 3600 * 1000;
  if (!Number.isFinite(step) || step <= 0) return out;
  let t = anchorMs;
  let guard = 0;
  while (t < fromMs && guard < 10000) {
    t += step;
    guard += 1;
  }
  while (t <= untilMs && guard < 20000) {
    out.push(new Date(t));
    t += step;
    guard += 1;
  }
  return out;
}

export function endOfDayMs(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
