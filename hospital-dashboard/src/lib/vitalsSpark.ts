import type { VitalLogRow } from "../types/dashboard";

const H24 = 24 * 3600000;

export function vitalPointsLast24h(vitals: VitalLogRow[], vitalType: VitalLogRow["vital_type"]): { iso: string; v: number }[] {
  const since = Date.now() - H24;
  return vitals
    .filter(
      (x) =>
        x.vital_type === vitalType &&
        x.value_numeric != null &&
        Number.isFinite(x.value_numeric) &&
        new Date(x.logged_at).getTime() >= since
    )
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map((x) => ({ iso: x.logged_at, v: x.value_numeric as number }));
}

export function latestVital(vitals: VitalLogRow[], vitalType: VitalLogRow["vital_type"]): number | null {
  const pts = vitals.filter((x) => x.vital_type === vitalType && x.value_numeric != null);
  if (pts.length === 0) return null;
  pts.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
  return pts[0].value_numeric ?? null;
}
