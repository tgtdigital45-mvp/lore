import type { PatientRow, SymptomLogDetail, VitalLogRow, WearableSampleRow } from "../types/dashboard";

const MS_DAY = 86400000;

function prdMax(s: SymptomLogDetail): number {
  if (s.entry_kind === "prd") {
    const a = s.pain_level ?? 0;
    const b = s.nausea_level ?? 0;
    const c = s.fatigue_level ?? 0;
    return Math.max(a, b, c);
  }
  const map: Record<string, number> = {
    mild: 3,
    moderate: 5,
    severe: 8,
    life_threatening: 10,
  };
  return s.severity ? map[s.severity] ?? 4 : 0;
}

function legacySeverityRank(s: SymptomLogDetail): number {
  if (s.entry_kind === "prd") return prdMax(s);
  const map: Record<string, number> = {
    mild: 1,
    moderate: 2,
    severe: 3,
    life_threatening: 4,
  };
  return s.severity ? map[s.severity] ?? 0 : 0;
}

/** Heurística 0–100: maior = maior probabilidade de não estar apto à próxima sessão. */
export function calculateSuspensionRisk(
  patient: PatientRow,
  symptoms: SymptomLogDetail[],
  vitals: VitalLogRow[],
  wearables: WearableSampleRow[],
  feverThresholdC: number
): { score: number; reasons: string[] } {
  const now = Date.now();
  const reasons: string[] = [];
  let score = 0;

  if (patient.is_in_nadir) {
    score += 18;
    reasons.push("Paciente em janela de nadir");
  }

  const since48h = now - 48 * MS_DAY;
  const recentVitals = vitals.filter((v) => new Date(v.logged_at).getTime() >= since48h);
  for (const v of recentVitals) {
    if (v.vital_type === "temperature" && v.value_numeric != null && v.value_numeric >= feverThresholdC) {
      score += 35;
      reasons.push(`Febre ≥ ${feverThresholdC} °C (48h)`);
      break;
    }
  }

  const since72h = now - 72 * MS_DAY;
  let severeSymptom = false;
  for (const s of symptoms) {
    if (new Date(s.logged_at).getTime() < since72h) continue;
    if (prdMax(s) >= 7 || legacySeverityRank(s) >= 3) {
      severeSymptom = true;
      break;
    }
  }
  if (severeSymptom) {
    score += 28;
    reasons.push("Sintomas intensos (72h)");
  }

  const since7d = now - 7 * MS_DAY;
  const fallEvents = wearables.filter(
    (w) =>
      w.metric === "falls_count" &&
      new Date(w.observed_start).getTime() >= since7d &&
      (w.value_numeric ?? 0) > 0
  );
  if (fallEvents.length > 0) {
    score += 22;
    reasons.push("Queda(s) registada(s) no período");
  }

  const hrvLow = wearables.filter(
    (w) =>
      w.metric === "hrv_sdnn" &&
      new Date(w.observed_start).getTime() >= since72h &&
      w.value_numeric != null &&
      w.value_numeric < 20
  );
  if (hrvLow.length >= 3) {
    score += 12;
    reasons.push("VFC baixa (possível stress/fadiga)");
  }

  return { score: Math.min(100, Math.round(score)), reasons: reasons.slice(0, 5) };
}
