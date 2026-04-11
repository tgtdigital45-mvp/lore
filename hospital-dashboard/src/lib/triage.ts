import { SEVERITY_RANK } from "../constants/dashboardLabels";
import type {
  HospitalEmbed,
  MergedAlertRules,
  PatientRow,
  RiskRow,
  SymptomLogTriage,
} from "../types/dashboard";

export const DEFAULT_ALERT_RULES: MergedAlertRules = {
  fever_celsius_min: 38,
  alert_window_hours: 72,
};

export function mergeAlertRulesFromAssignments(
  assigns: { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[]
): MergedAlertRules {
  let feverMin = Infinity;
  let windowH = 0;
  for (const row of assigns) {
    const h = row.hospitals;
    const list = !h ? [] : Array.isArray(h) ? h : [h];
    for (const hosp of list) {
      const raw = hosp?.alert_rules;
      const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      const f = r.fever_celsius_min;
      const w = r.alert_window_hours;
      if (typeof f === "number" && Number.isFinite(f)) feverMin = Math.min(feverMin, f);
      if (typeof w === "number" && w > 0) windowH = Math.max(windowH, w);
    }
  }
  if (!Number.isFinite(feverMin)) feverMin = DEFAULT_ALERT_RULES.fever_celsius_min;
  if (windowH <= 0) windowH = DEFAULT_ALERT_RULES.alert_window_hours;
  return { fever_celsius_min: feverMin, alert_window_hours: windowH };
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

    const sev = l.severity as string;
    if (sev === "severe" || sev === "life_threatening") {
      if (!hasSeverityReason) {
        hasSeverityReason = true;
        reasons.push(sev === "life_threatening" ? "Gravidade crítica" : "Gravidade alta");
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
    const r = SEVERITY_RANK[l.severity as string] ?? 0;
    if (r > maxRank) maxRank = r;
    const la = l.logged_at as string;
    if (!lastAt || new Date(la) > new Date(lastAt)) lastAt = la;
  }
  const { label, cls } = riskFromRank(maxRank, p.is_in_nadir);
  const { hasAlert, reasons } = patientClinicalAlert(logRows, p.id, rules, nowMs);
  const rules24h: MergedAlertRules = { fever_celsius_min: rules.fever_celsius_min, alert_window_hours: 24 };
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
  };
}
