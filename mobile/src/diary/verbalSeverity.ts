/** Escala verbal unificada (UI + PRD 0–10 + enum `symptom_severity` legado). */

export const VERBAL_SYMPTOM_LEVELS = [
  { key: "absent", label: "Não presente", db: "absent" as const, prdLevel: 0 },
  { key: "present", label: "Presente", db: "present" as const, prdLevel: 2 },
  { key: "mild", label: "Suave", db: "mild" as const, prdLevel: 4 },
  { key: "moderate", label: "Moderado", db: "moderate" as const, prdLevel: 6 },
  { key: "severe", label: "Grave", db: "severe" as const, prdLevel: 9 },
] as const;

export type VerbalSymptomKey = (typeof VERBAL_SYMPTOM_LEVELS)[number]["key"];

/** Subconjunto de `symptom_severity` usado na escala verbal (sem `life_threatening`). */
export type VerbalSymptomDbSeverity = (typeof VERBAL_SYMPTOM_LEVELS)[number]["db"];

export function prdLevelFromVerbalKey(key: VerbalSymptomKey): number {
  const row = VERBAL_SYMPTOM_LEVELS.find((x) => x.key === key);
  return row?.prdLevel ?? 0;
}

/** Valor 0–10 para o gráfico a partir da gravidade em BD (incl. legado). */
export function scale10FromDbSeverity(sev: string | null): number | null {
  if (!sev) return null;
  switch (sev) {
    case "absent":
      return 0;
    case "present":
      return 2;
    case "mild":
      return 4;
    case "moderate":
      return 6;
    case "severe":
      return 9;
    case "life_threatening":
      return 10;
    default:
      return null;
  }
}
