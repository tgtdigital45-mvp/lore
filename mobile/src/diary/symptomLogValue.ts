import type { SymptomDetailKey, SymptomLogRow } from "@/src/diary/symptomLogTypes";
import {
  ctcaeGradeFromDbSeverity,
  ctcaeGradeFromPrdLevel,
  effectiveVerbalSeverityForLegacyLog,
  labelForCtcaeGrade,
} from "@/src/diary/verbalSeverity";
import { labelSeverity } from "@/src/i18n/ui";

/** Valor numérico para o gráfico deste sintoma: febre = °C; resto = grau CTCAE 0–5 (ou null). */
export function valueForSymptomDetail(log: SymptomLogRow, key: SymptomDetailKey): number | null {
  if (key === "fever") {
    if (log.entry_kind === "legacy" && log.symptom_category === "fever" && log.body_temperature != null) {
      return Number(log.body_temperature);
    }
    return null;
  }
  if (log.entry_kind === "prd") {
    if (key === "pain") return ctcaeGradeFromPrdLevel(log.pain_level);
    if (key === "fatigue") return ctcaeGradeFromPrdLevel(log.fatigue_level);
    if (key === "nausea") return ctcaeGradeFromPrdLevel(log.nausea_level);
    return null;
  }
  if (log.entry_kind === "legacy" && log.symptom_category === key) {
    const sev = effectiveVerbalSeverityForLegacyLog(log);
    return ctcaeGradeFromDbSeverity(sev);
  }
  return null;
}

/** Linha principal do histórico (rótulo verbal; febre em °C). */
export function historyPrimaryLabelForRow(log: SymptomLogRow, key: SymptomDetailKey, val: number | null): string {
  if (key === "fever" && val != null) return `${val.toFixed(1)}°C`;
  if (log.entry_kind === "legacy") {
    const sev = effectiveVerbalSeverityForLegacyLog(log);
    if (sev) return labelSeverity(sev);
  }
  if (log.entry_kind === "prd" && val != null) return `${labelForCtcaeGrade(val)} · registro combinado (legado)`;
  if (val != null) return labelForCtcaeGrade(val);
  return "—";
}

export type TimeframeKey = "D" | "S" | "M" | "6M" | "A";

export function timeframeStartMs(tf: TimeframeKey, nowMs: number): number {
  switch (tf) {
    case "D": {
      // Hoje (início do dia local), alinhado ao que o utilizador espera de "D"
      const n = new Date(nowMs);
      return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    }
    case "S":
      return nowMs - 7 * 24 * 60 * 60 * 1000;
    case "M":
      return nowMs - 30 * 24 * 60 * 60 * 1000;
    case "6M":
      return nowMs - 180 * 24 * 60 * 60 * 1000;
    case "A":
      // Um ano (não "desde sempre"); evita janela idêntica a 6M quando há poucos dados
      return nowMs - 365 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

export function filterLogsForSymptomChart(
  logs: SymptomLogRow[],
  key: SymptomDetailKey,
  tf: TimeframeKey,
  nowMs: number
): { logged_at: string; value: number }[] {
  const start = timeframeStartMs(tf, nowMs);
  const out: { logged_at: string; value: number }[] = [];
  for (const log of logs) {
    const t = new Date(log.logged_at).getTime();
    if (t < start) continue;
    const v = valueForSymptomDetail(log, key);
    if (v == null || Number.isNaN(v)) continue;
    out.push({ logged_at: log.logged_at, value: v });
  }
  out.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
  return out;
}
