import type { SymptomDetailKey, SymptomLogRow } from "@/src/diary/symptomLogTypes";
import { scale10FromDbSeverity } from "@/src/diary/verbalSeverity";

/** Valor numérico para o gráfico deste sintoma (ou null se o registro não aplica). */
export function valueForSymptomDetail(log: SymptomLogRow, key: SymptomDetailKey): number | null {
  if (key === "fever") {
    if (log.entry_kind === "legacy" && log.symptom_category === "fever" && log.body_temperature != null) {
      return Number(log.body_temperature);
    }
    return null;
  }
  if (log.entry_kind === "prd") {
    if (key === "pain") return log.pain_level;
    if (key === "fatigue") return log.fatigue_level;
    if (key === "nausea") return log.nausea_level;
    return null;
  }
  if (log.entry_kind === "legacy" && log.symptom_category === key) {
    return scale10FromDbSeverity(log.severity);
  }
  return null;
}

export type TimeframeKey = "D" | "S" | "M" | "6M" | "A";

export function timeframeStartMs(tf: TimeframeKey, nowMs: number): number {
  const d = new Date(nowMs);
  switch (tf) {
    case "D":
      return nowMs - 24 * 60 * 60 * 1000;
    case "S":
      return nowMs - 7 * 24 * 60 * 60 * 1000;
    case "M":
      return nowMs - 30 * 24 * 60 * 60 * 1000;
    case "6M":
      return nowMs - 180 * 24 * 60 * 60 * 1000;
    case "A":
      return 0;
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
