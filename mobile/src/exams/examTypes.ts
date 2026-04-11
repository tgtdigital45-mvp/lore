/** Métricas normalizadas (JSON da IA ou linhas em biomarker_logs). */
export type ExamMetric = {
  id?: string;
  name: string;
  value: string;
  unit: string;
  isAbnormal: boolean;
  referenceAlert: string;
  referenceRange?: string;
};

export function metricsFromJson(j: Record<string, unknown> | null | undefined): ExamMetric[] {
  const raw = j?.metrics;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m): ExamMetric | null => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : "";
      if (!name) return null;
      const value = typeof o.value === "string" ? o.value : String(o.value ?? "");
      const unit = typeof o.unit === "string" ? o.unit : "";
      const isAbnormal = Boolean(o.is_abnormal ?? o.isAbnormal);
      const referenceAlert =
        typeof o.reference_alert === "string"
          ? o.reference_alert
          : typeof o.referenceAlert === "string"
            ? o.referenceAlert
            : "";
      const refRangeRaw =
        typeof o.reference_range === "string"
          ? o.reference_range
          : typeof o.referenceRange === "string"
            ? o.referenceRange
            : "";
      const base: ExamMetric = { name, value, unit, isAbnormal, referenceAlert };
      if (refRangeRaw.trim()) base.referenceRange = refRangeRaw.trim();
      return base;
    })
    .filter((x): x is ExamMetric => x !== null);
}
