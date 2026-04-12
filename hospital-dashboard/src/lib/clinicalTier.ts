import type { RiskRow } from "@/types/dashboard";

export type ClinicalTier = "critical" | "attention" | "stable";

/** Alinhado ao mock: vermelho (crítico), âmbar (atenção), índigo (estável). */
export function clinicalTier(r: RiskRow): ClinicalTier {
  if (r.risk >= 4 || r.hasClinicalAlert) return "critical";
  if (r.risk >= 2 || r.is_in_nadir) return "attention";
  return "stable";
}

export const TIER_ACCENT: Record<ClinicalTier, string> = {
  critical: "#EF4444",
  attention: "#F59E0B",
  stable: "#6366F1",
};

export const TIER_LABEL: Record<ClinicalTier, string> = {
  critical: "Crítico",
  attention: "Atenção",
  stable: "Estável",
};
