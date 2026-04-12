/** Regiões para dor — passo dedicado antes da intensidade (estilo passo-a-passo). */

export const PAIN_REGIONS = [
  { id: "head", label: "Cabeça" },
  { id: "neck", label: "Pescoço / ombros" },
  { id: "chest", label: "Tórax" },
  { id: "abdomen", label: "Abdómen" },
  { id: "back", label: "Costas" },
  { id: "upper_limbs", label: "Braços / mãos" },
  { id: "lower_limbs", label: "Pernas / pés" },
  { id: "general", label: "Geral / difuso" },
] as const;

export type PainRegionId = (typeof PAIN_REGIONS)[number]["id"];

export function labelPainRegion(id: string): string {
  return PAIN_REGIONS.find((r) => r.id === id)?.label ?? id;
}
