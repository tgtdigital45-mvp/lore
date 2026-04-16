/** Escala verbal unificada (UI + PRD 0–10 + gravidade em `symptom_logs.severity` como texto). */

export const VERBAL_SYMPTOM_LEVELS = [
  { key: "absent", label: "Não presente", db: "absent" as const, prdLevel: 0 },
  { key: "present", label: "Presente", db: "present" as const, prdLevel: 2 },
  { key: "mild", label: "Suave", db: "mild" as const, prdLevel: 4 },
  { key: "moderate", label: "Moderado", db: "moderate" as const, prdLevel: 6 },
  { key: "severe", label: "Grave", db: "severe" as const, prdLevel: 9 },
] as const;

export type VerbalSymptomKey = (typeof VERBAL_SYMPTOM_LEVELS)[number]["key"];

/** Valores da escala verbal persistidos em `symptom_logs.severity` (sem `life_threatening`). */
export type VerbalSymptomDbSeverity = (typeof VERBAL_SYMPTOM_LEVELS)[number]["db"];

/** Lê o nível verbal guardado em `notes` quando a coluna `severity` foi coagida para `mild` (dados antigos). */
export function parseLegacyVerbalFromNotes(notes: string | null): VerbalSymptomDbSeverity | null {
  if (!notes?.trim()) return null;
  try {
    const j = JSON.parse(notes) as { legacy_verbal?: string; kind?: string; verbal?: string };
    if (typeof j.legacy_verbal === "string" && isVerbalSymptomDbSeverity(j.legacy_verbal)) {
      return j.legacy_verbal;
    }
    if (j.kind === "legacy_verbal_meta" && typeof j.verbal === "string" && isVerbalSymptomDbSeverity(j.verbal)) {
      return j.verbal;
    }
    return null;
  } catch {
    return null;
  }
}

function isVerbalSymptomDbSeverity(s: string): s is VerbalSymptomDbSeverity {
  return VERBAL_SYMPTOM_LEVELS.some((x) => x.db === s);
}

/** Grau CTCAE / gráfico: preferir verbal em notas quando existir (histórico coagido). */
export function effectiveVerbalSeverityForLegacyLog(log: { severity: string | null; notes: string | null }): string | null {
  return parseLegacyVerbalFromNotes(log.notes) ?? log.severity;
}

export function prdLevelFromVerbalKey(key: VerbalSymptomKey): number {
  const row = VERBAL_SYMPTOM_LEVELS.find((x) => x.key === key);
  return row?.prdLevel ?? 0;
}

/**
 * Grau CTCAE 0–5 (tabela única) a partir de `symptom_logs.severity` em BD.
 * absent=0, present=1, mild=2, moderate=3, severe=4, life_threatening=5.
 */
export function ctcaeGradeFromDbSeverity(sev: string | null): number | null {
  if (!sev) return null;
  switch (sev) {
    case "absent":
      return 0;
    case "present":
      return 1;
    case "mild":
      return 2;
    case "moderate":
      return 3;
    case "severe":
      return 4;
    case "life_threatening":
      return 5;
    default:
      return null;
  }
}

/** Rótulo curto para grau 0–5 (gráfico / histórico). */
export function labelForCtcaeGrade(grade: number): string {
  const g = Math.max(0, Math.min(5, Math.round(grade)));
  const labels = ["Não presente", "Presente", "Suave", "Moderado", "Grave", "Ameaça à vida"];
  return labels[g] ?? "—";
}

/**
 * Converte níveis 0–10 dos registos PRD antigos para grau CTCAE 0–5 (aproximação para histórico).
 */
export function ctcaeGradeFromPrdLevel(level: number | null | undefined): number | null {
  if (level == null || !Number.isFinite(Number(level))) return null;
  const v = Math.max(0, Math.min(10, Number(level)));
  return Math.round((v / 10) * 5);
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
