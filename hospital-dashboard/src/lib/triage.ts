import { SEVERITY_RANK } from "../constants/dashboardLabels";
import type {
  HospitalEmbed,
  MergedAlertRules,
  PatientRow,
  RiskRow,
  SymptomLogTriage,
} from "../types/dashboard";

/** Febrile alerta clínico: ≥ 37,8 °C (grave). CTCAE: defaults alinhados a `ctcae_triage_thresholds` no Supabase. */
export const DEFAULT_ALERT_RULES: MergedAlertRules = {
  fever_celsius_min: 37.8,
  alert_window_hours: 72,
  ctcae_yellow_min_grade: 2,
  ctcae_red_min_grade: 3,
};

export function mergeAlertRulesFromAssignments(
  assigns: { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[]
): MergedAlertRules {
  let feverMin = Infinity;
  let windowH = 0;
  let yellowG = Infinity;
  let redG = 0;
  for (const row of assigns) {
    const h = row.hospitals;
    const list = !h ? [] : Array.isArray(h) ? h : [h];
    for (const hosp of list) {
      const raw = hosp?.alert_rules;
      const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      const f = r.fever_celsius_min;
      const w = r.alert_window_hours;
      const cy = r.ctcae_yellow_min_grade;
      const cr = r.ctcae_red_min_grade;
      if (typeof f === "number" && Number.isFinite(f)) feverMin = Math.min(feverMin, f);
      if (typeof w === "number" && w > 0) windowH = Math.max(windowH, w);
      if (typeof cy === "number" && Number.isFinite(cy)) yellowG = Math.min(yellowG, cy);
      if (typeof cr === "number" && Number.isFinite(cr)) redG = Math.max(redG, cr);
    }
  }
  if (!Number.isFinite(feverMin)) feverMin = DEFAULT_ALERT_RULES.fever_celsius_min;
  if (windowH <= 0) windowH = DEFAULT_ALERT_RULES.alert_window_hours;
  /** Nunca acima de 37,8 °C: febre grave considera-se a partir deste limiar. */
  const fever_celsius_min = Math.min(feverMin, 37.8);
  const ctcae_yellow_min_grade = Number.isFinite(yellowG) ? yellowG : DEFAULT_ALERT_RULES.ctcae_yellow_min_grade!;
  const ctcae_red_min_grade = redG > 0 ? redG : DEFAULT_ALERT_RULES.ctcae_red_min_grade!;
  return { fever_celsius_min, alert_window_hours: windowH, ctcae_yellow_min_grade, ctcae_red_min_grade };
}

/** Grau numérico para triagem (0–4), incluindo diário PRD (dor/náusea/fadiga 0–10) e ePROM CTCAE (ae_flow). */
export function symptomLogTriageRank(l: SymptomLogTriage): number {
  if (l.entry_kind === "prd") {
    const mx = Math.max(l.pain_level ?? 0, l.nausea_level ?? 0, l.fatigue_level ?? 0);
    if (mx >= 9) return 4;
    if (mx >= 8) return 3;
    if (mx >= 6) return 2;
    if (mx >= 3) return 1;
    return 0;
  }
  if (l.entry_kind === "ae_flow" && l.ae_max_grade != null) {
    const g = l.ae_max_grade;
    if (g >= 4) return 4;
    if (g >= 3) return 3;
    if (g >= 2) return 2;
    if (g >= 1) return 1;
    return 0;
  }
  const sev = (l.severity ?? "") as string;
  return SEVERITY_RANK[sev] ?? 0;
}

export function patientClinicalAlert(
  logs: SymptomLogTriage[],
  patientId: string,
  rules: MergedAlertRules,
  nowMs: number
): { hasAlert: boolean; reasons: string[] } {
  const cutoff = nowMs - rules.alert_window_hours * 3600 * 1000;
  const reasons: string[] = [];
  let hasFeverReason = false;
  let hasSeverityReason = false;

  for (const l of logs) {
    if (l.patient_id !== patientId) continue;
    if (new Date(l.logged_at).getTime() < cutoff) continue;

    if (l.entry_kind === "prd") {
      const mx = Math.max(l.pain_level ?? 0, l.nausea_level ?? 0, l.fatigue_level ?? 0);
      if (mx >= 8 && !hasSeverityReason) {
        hasSeverityReason = true;
        reasons.push("Escala PRD elevada (≥8)");
      }
    } else if (l.entry_kind === "ae_flow" && l.ae_max_grade != null) {
      const redMin = rules.ctcae_red_min_grade ?? 3;
      if (l.ae_max_grade >= redMin && !hasSeverityReason) {
        hasSeverityReason = true;
        reasons.push(`Toxicidade AE grau ≥${redMin} (ePROM)`);
      }
    } else {
      const sev = l.severity as string;
      if (sev === "severe" || sev === "life_threatening") {
        if (!hasSeverityReason) {
          hasSeverityReason = true;
          reasons.push(sev === "life_threatening" ? "Gravidade crítica" : "Gravidade alta");
        }
      }
    }

    if (l.symptom_category === "fever" && l.body_temperature != null && Number.isFinite(Number(l.body_temperature))) {
      const temp = Number(l.body_temperature);
      if (temp >= rules.fever_celsius_min && !hasFeverReason) {
        hasFeverReason = true;
        reasons.push(`Febre ≥ ${rules.fever_celsius_min} °C (${temp.toFixed(1)} °C)`);
      }
    }
  }

  return { hasAlert: reasons.length > 0, reasons };
}

function riskFromRank(n: number, inNadir: boolean): { label: string; cls: string } {
  if (n >= 4) return { label: "Crítico", cls: "risk-critical" };
  if (n >= 3) return { label: "Alto", cls: "risk-high" };
  if (n >= 2) return { label: "Médio", cls: "risk-mid" };
  if (n >= 1) return { label: "Baixo", cls: "risk-low" };
  if (inNadir) return { label: "Nadir (vigilância)", cls: "risk-nadir" };
  return { label: "Sem registros recentes", cls: "risk-none" };
}

function worstUrgencySemaphore(
  logRows: SymptomLogTriage[],
  patientId: string,
  sinceRiskMs: number
): "red" | "yellow" | "green" | null {
  let score = 0;
  let result: "red" | "yellow" | "green" | null = null;
  for (const l of logRows) {
    if (l.patient_id !== patientId) continue;
    if (new Date(l.logged_at).getTime() < sinceRiskMs) continue;
    const s = l.triage_semaphore;
    const sc = s === "red" ? 3 : s === "yellow" ? 2 : s === "green" ? 1 : 0;
    if (sc > score) {
      score = sc;
      if (s === "red" || s === "yellow" || s === "green") result = s;
    }
  }
  return result;
}

export function buildRiskRow(
  p: PatientRow,
  logRows: SymptomLogTriage[],
  rules: MergedAlertRules,
  nowMs: number
): RiskRow {
  const sinceRiskMs = nowMs - 168 * 3600 * 1000;
  let maxRank = 0;
  let lastAt: string | null = null;
  for (const l of logRows) {
    if (l.patient_id !== p.id) continue;
    if (new Date(l.logged_at).getTime() < sinceRiskMs) continue;
    const r = symptomLogTriageRank(l);
    if (r > maxRank) maxRank = r;
    const la = l.logged_at as string;
    if (!lastAt || new Date(la) > new Date(lastAt)) lastAt = la;
  }
  const { label, cls } = riskFromRank(maxRank, p.is_in_nadir);
  const { hasAlert, reasons } = patientClinicalAlert(logRows, p.id, rules, nowMs);
  const rules24h: MergedAlertRules = {
    fever_celsius_min: rules.fever_celsius_min,
    alert_window_hours: 24,
    ctcae_yellow_min_grade: rules.ctcae_yellow_min_grade,
    ctcae_red_min_grade: rules.ctcae_red_min_grade,
  };
  const { hasAlert: hasAlert24h } = patientClinicalAlert(logRows, p.id, rules24h, nowMs);
  return {
    ...p,
    risk: maxRank,
    riskLabel: label,
    riskClass: cls,
    lastSymptomAt: lastAt,
    hasClinicalAlert: hasAlert,
    alertReasons: reasons,
    hasAlert24h,
    urgencySemaphore: worstUrgencySemaphore(logRows, p.id, sinceRiskMs),
  };
}
