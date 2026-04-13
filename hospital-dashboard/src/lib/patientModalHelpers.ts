import {
  NUTRITION_LOG_TYPE_PT,
  SEVERITY_PT,
  SYMPTOM_CATEGORY_PT,
  SYMPTOM_CATEGORY_EN_FALLBACK,
  VITAL_TYPE_PT,
} from "../constants/dashboardLabels";
import type { MedicationLogRow, NutritionLogRow, SymptomLogDetail, TreatmentCycleRow, VitalLogRow } from "../types/dashboard";
import { pillClassForSeverity } from "./riskUi";

export function medicationNameFromLog(log: MedicationLogRow): string {
  const raw = log.medications;
  const o = Array.isArray(raw) ? raw[0] : raw;
  return o?.name?.trim() || "Medicamento";
}

/** Data/hora a mostrar para um registro de toma (wizard ou esquema antigo). */
export function medicationLogWhenIso(log: MedicationLogRow): string | null {
  const t = log.taken_at ?? log.taken_time ?? log.scheduled_time;
  return t && String(t).trim() !== "" ? t : null;
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

/** Data/hora estimada da próxima infusão: última sessão registrada + N dias corridos (intervalo entre infusões). */
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

function mapSymptomCategoryDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return "—";
  if (SYMPTOM_CATEGORY_PT[t]) return SYMPTOM_CATEGORY_PT[t];
  const lower = t.toLowerCase();
  if (SYMPTOM_CATEGORY_PT[lower]) return SYMPTOM_CATEGORY_PT[lower];
  const snake = lower.replace(/\s+/g, "_");
  if (SYMPTOM_CATEGORY_PT[snake]) return SYMPTOM_CATEGORY_PT[snake];
  if (SYMPTOM_CATEGORY_EN_FALLBACK[lower]) return SYMPTOM_CATEGORY_EN_FALLBACK[lower];
  if (t.includes(",")) {
    return t
      .split(",")
      .map((p) => mapSymptomCategoryDisplay(p.trim()))
      .join(" · ");
  }
  return t;
}

export function symptomCategoryLabel(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    return "Escala (dor · náusea · fadiga)";
  }
  if (s.entry_kind === "ae_flow") {
    return "ePROM CTCAE";
  }
  return mapSymptomCategoryDisplay(s.symptom_category ?? "");
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
  if (s.entry_kind === "ae_flow" && s.ae_max_grade != null) {
    const g = s.ae_max_grade;
    if (g >= 4) return "risk-critical";
    if (g >= 3) return "risk-high";
    if (g >= 2) return "risk-mid";
    if (g >= 1) return "risk-low";
    return "risk-none";
  }
  return pillClassForSeverity(s.severity ?? "");
}

export function symptomSeverityLabel(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    return `Dor ${s.pain_level ?? "—"}/10 · Náusea ${s.nausea_level ?? "—"}/10 · Fadiga ${s.fatigue_level ?? "—"}/10`;
  }
  if (s.entry_kind === "ae_flow" && s.ae_max_grade != null) {
    return `Grau CTCAE (máx.): ${s.ae_max_grade}/5`;
  }
  const sev = (s.severity ?? "").trim();
  if (!sev) return "—";
  const k = sev.toLowerCase();
  return SEVERITY_PT[k] ?? SEVERITY_PT[sev] ?? sev;
}

/** Texto curto para cartão «Resumo» (evita parágrafo no pill). */
export function symptomSeverityShort(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    const mx = Math.max(s.pain_level ?? 0, s.nausea_level ?? 0, s.fatigue_level ?? 0);
    return `Máx. ${mx}/10`;
  }
  if (s.entry_kind === "ae_flow" && s.ae_max_grade != null) {
    return `CTCAE ${s.ae_max_grade}/5`;
  }
  const sev = (s.severity ?? "").trim();
  if (!sev) return "—";
  const k = sev.toLowerCase();
  return SEVERITY_PT[k] ?? sev;
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
