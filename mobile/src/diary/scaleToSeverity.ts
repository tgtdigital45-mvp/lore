/** Mapeia 0–10 para gravidade clínica (registo legado). */

export const LEGACY_SEVERITIES = ["mild", "moderate", "severe", "life_threatening"] as const;
export type LegacySeverity = (typeof LEGACY_SEVERITIES)[number];

export function scale0to10ToSeverity(n: number): LegacySeverity {
  const x = Math.max(0, Math.min(10, Math.round(n)));
  if (x <= 2) return "mild";
  if (x <= 5) return "moderate";
  if (x <= 8) return "severe";
  return "life_threatening";
}
