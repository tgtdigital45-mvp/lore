import { NUTRITION_LOG_TYPE_PT, SEVERITY_PT, SYMPTOM_CATEGORY_PT, VITAL_TYPE_PT } from "../constants/dashboardLabels";
import type { MedicationLogRow, NutritionLogRow, SymptomLogDetail, TreatmentCycleRow, VitalLogRow } from "../types/dashboard";
import { pillClassForSeverity } from "./riskUi";

export function medicationNameFromLog(log: MedicationLogRow): string {
  const raw = log.medications;
  const o = Array.isArray(raw) ? raw[0] : raw;
  return o?.name?.trim() || "Medicamento";
}

/** Posição 1-based do ciclo dentro do mesmo protocolo (por data de início). */
export function chemoSessionNumberInProtocol(cycles: TreatmentCycleRow[], cycle: TreatmentCycleRow): number {
  const same = cycles.filter((c) => c.protocol_name === cycle.protocol_name);
  const sorted = [...same].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const idx = sorted.findIndex((c) => c.id === cycle.id);
  return idx >= 0 ? idx + 1 : 1;
}

export function countCyclesInProtocol(cycles: TreatmentCycleRow[], protocolName: string): number {
  return cycles.filter((c) => c.protocol_name === protocolName).length;
}

export function countCompletedInProtocol(cycles: TreatmentCycleRow[], protocolName: string): number {
  return cycles.filter((c) => c.protocol_name === protocolName && c.status === "completed").length;
}

/** Data/hora estimada da próxima infusão: última sessão registada + N dias corridos (intervalo entre infusões). */
export function nextInfusionIsoFromCycle(cycle: TreatmentCycleRow | null): string | null {
  if (!cycle) return null;
  const days = cycle.infusion_interval_days;
  if (days == null || days < 1) return null;
  const raw = cycle.last_session_at?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Hidratação é hábito/nutrição no diário — não aparece na tabela clínica de sintomas. */
const EXCLUDE_FROM_SYMPTOM_HISTORY = new Set(["hydration"]);

export function symptomLogsForClinicalHistory(logs: SymptomLogDetail[]): SymptomLogDetail[] {
  return logs.filter((s) => !EXCLUDE_FROM_SYMPTOM_HISTORY.has((s.symptom_category ?? "").toLowerCase()));
}

export function symptomCategoryLabel(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    return "Escala (dor · náusea · fadiga)";
  }
  const raw = (s.symptom_category ?? "").trim();
  if (!raw) return "—";
  return SYMPTOM_CATEGORY_PT[raw] ?? raw;
}

export function symptomSeverityPillClass(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    const mx = Math.max(s.pain_level ?? 0, s.nausea_level ?? 0, s.fatigue_level ?? 0);
    if (mx >= 8) return "risk-critical";
    if (mx >= 5) return "risk-high";
    if (mx >= 3) return "risk-mid";
    if (mx >= 1) return "risk-low";
    return "risk-none";
  }
  return pillClassForSeverity(s.severity ?? "");
}

export function symptomSeverityLabel(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    return `Dor ${s.pain_level ?? "—"}/10 · Náusea ${s.nausea_level ?? "—"}/10 · Fadiga ${s.fatigue_level ?? "—"}/10`;
  }
  return SEVERITY_PT[s.severity ?? ""] ?? s.severity ?? "—";
}

/** Texto curto para cartão «Resumo» (evita parágrafo no pill). */
export function symptomSeverityShort(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    const mx = Math.max(s.pain_level ?? 0, s.nausea_level ?? 0, s.fatigue_level ?? 0);
    return `Máx. ${mx}/10`;
  }
  return SEVERITY_PT[s.severity ?? ""] ?? s.severity ?? "—";
}

export function nutritionLogTypeLabel(logType: string): string {
  return NUTRITION_LOG_TYPE_PT[logType] ?? logType;
}

export function vitalTypeLabel(vitalType: string): string {
  return VITAL_TYPE_PT[vitalType] ?? vitalType;
}

export function formatVitalLogDetail(v: VitalLogRow): string {
  if (v.vital_type === "blood_pressure" && v.value_systolic != null && v.value_diastolic != null) {
    return `${v.value_systolic}/${v.value_diastolic} mmHg`;
  }
  if (v.value_numeric != null) {
    const u = v.unit?.trim() ?? "";
    return u ? `${v.value_numeric} ${u}` : String(v.value_numeric);
  }
  return "—";
}

export function formatNutritionLogDetail(n: NutritionLogRow): string {
  const parts: string[] = [];
  switch (n.log_type) {
    case "water":
    case "coffee":
      if (n.quantity != null) parts.push(`${n.quantity} ml`);
      break;
    case "meal": {
      if (n.meal_name?.trim()) parts.push(n.meal_name.trim());
      if (n.calories != null) parts.push(`${n.calories} kcal`);
      if (n.protein_g != null) parts.push(`P ${n.protein_g} g`);
      if (n.carbs_g != null) parts.push(`C ${n.carbs_g} g`);
      if (n.fat_g != null) parts.push(`G ${n.fat_g} g`);
      break;
    }
    case "calories":
      if (n.calories != null) parts.push(`${n.calories} kcal`);
      break;
    case "appetite":
      if (n.appetite_level != null) parts.push(`Nível ${n.appetite_level}/10`);
      break;
    default:
      break;
  }
  if (n.notes?.trim()) parts.push(n.notes.trim());
  return parts.length ? parts.join(" · ") : "—";
}
