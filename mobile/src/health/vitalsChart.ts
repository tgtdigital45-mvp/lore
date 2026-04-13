import { timeframeStartMs, type TimeframeKey } from "@/src/diary/symptomLogValue";
import type { VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

export type VitalChartPoint = {
  logged_at: string;
  value: number;
  /** Rótulo curto no eixo X */
  label: string;
  /** Texto no ponto (ex.: 120/80 para PA) */
  dataPointText: string;
};

function shortDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function numericForChart(row: VitalLogRow, type: VitalType): { value: number; dataPointText: string } | null {
  if (type === "blood_pressure") {
    const s = row.value_systolic;
    const di = row.value_diastolic;
    if (s == null || di == null) return null;
    return { value: s, dataPointText: `${s}/${di}` };
  }
  if (row.value_numeric == null || Number.isNaN(row.value_numeric)) return null;
  const v = row.value_numeric;
  if (type === "temperature") {
    return { value: v, dataPointText: `${v.toFixed(1)}°` };
  }
  return { value: v, dataPointText: String(Math.round(v)) };
}

export function filterVitalLogsForChart(
  logs: VitalLogRow[],
  vitalType: VitalType,
  tf: TimeframeKey,
  nowMs: number
): VitalChartPoint[] {
  const start = timeframeStartMs(tf, nowMs);
  const out: VitalChartPoint[] = [];
  for (const row of logs) {
    if (row.vital_type !== vitalType) continue;
    const t = new Date(row.logged_at).getTime();
    if (t < start) continue;
    const n = numericForChart(row, vitalType);
    if (!n) continue;
    out.push({
      logged_at: row.logged_at,
      value: n.value,
      label: shortDayLabel(row.logged_at),
      dataPointText: n.dataPointText,
    });
  }
  out.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
  return out;
}

function dynamicRange(points: VitalChartPoint[], fallbackMax: number, fallbackMin: number) {
  if (points.length === 0) {
    return { maxValue: fallbackMax, yAxisOffset: fallbackMin, noOfSections: 4 as const };
  }
  const maxV = Math.max(...points.map((p) => p.value));
  const minV = Math.min(...points.map((p) => p.value));
  const span = Math.max(maxV - minV, 1);
  const pad = span * 0.12 + (maxV * 0.02 || 1);
  return {
    maxValue: Math.ceil(maxV + pad),
    yAxisOffset: Math.max(0, Math.floor(minV - pad)),
    noOfSections: 4 as const,
  };
}

/** Eixos estáveis para leitura clínica; FC/PA/glicemia/peso ajustam ao intervalo dos dados. */
export function chartLayoutFor(vitalType: VitalType, points: VitalChartPoint[]): { maxValue: number; yAxisOffset: number; noOfSections: number } {
  switch (vitalType) {
    case "temperature":
      return { maxValue: 42, yAxisOffset: 35, noOfSections: 4 };
    case "spo2":
      return { maxValue: 100, yAxisOffset: 85, noOfSections: 3 };
    case "heart_rate":
      return dynamicRange(points, 180, 45);
    case "blood_pressure":
      return dynamicRange(points, 200, 60);
    case "glucose":
      return dynamicRange(points, 250, 40);
    case "weight":
      return dynamicRange(points, 100, 40);
    default:
      return dynamicRange(points, 100, 0);
  }
}
