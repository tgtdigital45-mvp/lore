import type {
  AlertMetricKind,
  MedicationReferenceRow,
  ProtocolAlertRuleRow,
  ProtocolDayAnchorsRow,
  ProtocolGuidelineWindowRow,
  ProtocolMedicationWatchRow,
  ProtocolTimeAnchor,
} from "./protocolAlertAnchors";

export interface DayAnchors {
  days_from_cycle_start: number;
  days_from_last_infusion: number | null;
}

export function anchorsFromRpc(row: ProtocolDayAnchorsRow): DayAnchors {
  return {
    days_from_cycle_start: row.days_from_cycle_start,
    days_from_last_infusion: row.days_from_last_infusion,
  };
}

export function anchorValueForWindow(timeAnchor: ProtocolTimeAnchor, a: DayAnchors): number | null {
  if (timeAnchor === "from_cycle_start") return a.days_from_cycle_start;
  return a.days_from_last_infusion;
}

/** Inclusivo em min; max null = sem teto. */
export function dayInWindow(d: number | null, min: number, max: number | null): boolean {
  if (d === null) return false;
  if (d < min) return false;
  if (max === null) return true;
  return d <= max;
}

export function windowMatches(w: Pick<ProtocolGuidelineWindowRow, "time_anchor" | "day_offset_min" | "day_offset_max">, a: DayAnchors): boolean {
  const d = anchorValueForWindow(w.time_anchor, a);
  return dayInWindow(d, w.day_offset_min, w.day_offset_max);
}

/**
 * Diretriz sem linhas em protocol_guideline_windows para esse protocolo+guideline
 * é tratada como válida em qualquer dia. Se existir pelo menos uma janela para o guideline,
 * exige match nalguma.
 */
export function filterGuidelineIdsByWindows(
  guidelineIds: string[],
  windows: ProtocolGuidelineWindowRow[],
  a: DayAnchors
): string[] {
  const byG = new Map<string, ProtocolGuidelineWindowRow[]>();
  for (const w of windows) {
    const arr = byG.get(w.guideline_id) ?? [];
    arr.push(w);
    byG.set(w.guideline_id, arr);
  }
  return guidelineIds.filter((gid) => {
    const rows = byG.get(gid);
    if (!rows || rows.length === 0) return true;
    return rows.some((w) => windowMatches(w, a));
  });
}

export function normalizeMedName(s: string): string {
  return s.toLowerCase().trim();
}

/** Match por medication_reference_id explícito ou nome/sinónimos. */
export function medicationMatchesReference(
  patientMed: { name: string; medication_reference_id?: string | null },
  ref: MedicationReferenceRow
): boolean {
  if (patientMed.medication_reference_id && patientMed.medication_reference_id === ref.id) return true;
  const n = normalizeMedName(patientMed.name);
  if (n.includes(normalizeMedName(ref.canonical_name))) return true;
  for (const syn of ref.synonyms ?? []) {
    if (syn && n.includes(normalizeMedName(syn))) return true;
  }
  return false;
}

export function guidelineIdsFromMedicationWatches(
  watches: ProtocolMedicationWatchRow[],
  refs: MedicationReferenceRow[],
  activeMeds: { name: string; medication_reference_id?: string | null }[]
): Set<string> {
  const out = new Set<string>();
  const refById = new Map(refs.map((r) => [r.id, r] as const));
  for (const w of watches) {
    const ref = refById.get(w.medication_reference_id);
    if (!ref) continue;
    for (const m of activeMeds) {
      if (medicationMatchesReference(m, ref)) {
        out.add(w.guideline_id);
        break;
      }
    }
  }
  return out;
}

export type ConditionOp = "gte" | "gt" | "lte" | "lt" | "eq";

export interface NumericCondition {
  op: ConditionOp;
  value: number;
}

export function parseNumericCondition(raw: Record<string, unknown>): NumericCondition | null {
  const op = raw.op;
  const value = raw.value;
  if (typeof op !== "string" || typeof value !== "number") return null;
  if (!["gte", "gt", "lte", "lt", "eq"].includes(op)) return null;
  return { op: op as ConditionOp, value };
}

export function compareNum(op: ConditionOp, left: number, right: number): boolean {
  switch (op) {
    case "gte":
      return left >= right;
    case "gt":
      return left > right;
    case "lte":
      return left <= right;
    case "lt":
      return left < right;
    case "eq":
      return left === right;
    default:
      return false;
  }
}

export interface MetricSnapshot {
  lastTemperatureC: number | null;
  lastPlateletCount: number | null;
  lastSymptomSeverityRank: number | null;
}

/** Ordem aproximada para severidade legada (se necessário). */
const SEVERITY_RANK: Record<string, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
  life_threatening: 4,
};

export function severityRank(severity: string | null | undefined): number | null {
  if (!severity) return null;
  return SEVERITY_RANK[severity] ?? null;
}

export interface FiredAlert {
  rule: ProtocolAlertRuleRow;
  message: string;
}

function metricValue(kind: AlertMetricKind, snap: MetricSnapshot): number | null {
  switch (kind) {
    case "body_temperature":
      return snap.lastTemperatureC;
    case "lab_platelets":
      return snap.lastPlateletCount;
    case "symptom_severity":
      return snap.lastSymptomSeverityRank;
    default:
      return null;
  }
}

/**
 * Avalia regras cuja janela temporal coincide; dispara se condição numérica for verdadeira
 * (metric_kind custom não avaliado aqui).
 */
export function evaluateAlertRules(
  rules: ProtocolAlertRuleRow[],
  a: DayAnchors,
  snap: MetricSnapshot
): FiredAlert[] {
  const fired: FiredAlert[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const d = anchorValueForWindow(rule.time_anchor, a);
    if (!dayInWindow(d, rule.day_offset_min, rule.day_offset_max)) continue;
    if (rule.metric_kind === "custom") continue;
    const val = metricValue(rule.metric_kind, snap);
    if (val === null) continue;
    const cond = parseNumericCondition(rule.condition);
    if (!cond) continue;
    if (!compareNum(cond.op, val, cond.value)) continue;
    const message = rule.message_template?.trim() || rule.action_required || rule.name;
    fired.push({ rule, message });
  }
  return fired;
}
