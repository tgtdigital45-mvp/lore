import type {
  BiomarkerModalRow,
  HeuristicRule,
  PatientRow,
  SymptomLogDetail,
  VitalLogRow,
  WearableSampleRow,
} from "../types/dashboard";

const MS_HOUR = 3600000;
const MS_DAY = 86400000;

/** Fallback se `heuristic_rules` estiver vazio ou sem a regra. */
const FALLBACK_POINTS: Record<string, number> = {
  neutropenic_fever: 100,
  anc_critical: 100,
  platelets_critical: 95,
  hepatorenal_toxicity: 80,
  fever_isolated: 35,
  diarrhea_grade3: 40,
  mucositis_severe: 30,
  nausea_refractory: 28,
  fatigue_extreme: 25,
  weight_loss_rapid: 20,
  nadir: 18,
  falls: 22,
  low_hrv: 12,
};

const ANC_ALIASES = ["neutrófilos", "anc", "neutrophils", "granulócitos neutrófilos", "segmentados"];
const PLT_ALIASES = ["plaquetas", "platelets", "plt"];
const CRE_ALIASES = ["creatinina", "creatinine"];
const AST_ALIASES = ["tgo", "ast", "aspartato aminotransferase", "aspartato"];
const ALT_ALIASES = ["tgp", "alt", "alanina aminotransferase", "alanina"];
const BILI_ALIASES = ["bilirrubina total", "bilirrubina", "bilirubin"];

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function biomarkerMatches(name: string, aliases: string[]): boolean {
  const n = normName(name);
  for (const a of aliases) {
    const al = normName(a);
    if (n === al || n.includes(al) || al.includes(n)) return true;
  }
  return false;
}

function pointsFor(ruleName: string, rules: HeuristicRule[] | undefined): number {
  if (rules?.length) {
    const r = rules.find((x) => x.rule_name === ruleName);
    if (r) return r.points;
  }
  return FALLBACK_POINTS[ruleName] ?? 0;
}

function windowHours(ruleName: string, rules: HeuristicRule[] | undefined, fallback: number): number {
  if (rules?.length) {
    const r = rules.find((x) => x.rule_name === ruleName);
    if (r) return r.time_window_hours;
  }
  return fallback;
}

/** Último valor numérico de biomarcador compatível dentro da janela [sinceMs, now]. */
function latestBiomarkerInWindow(
  biomarkers: BiomarkerModalRow[],
  aliases: string[],
  sinceMs: number,
  nowMs: number
): BiomarkerModalRow | null {
  let best: BiomarkerModalRow | null = null;
  let bestT = 0;
  for (const b of biomarkers) {
    const t = new Date(b.logged_at).getTime();
    if (t < sinceMs || t > nowMs) continue;
    if (!biomarkerMatches(b.name, aliases)) continue;
    if (b.value_numeric == null || Number.isNaN(b.value_numeric)) continue;
    if (t >= bestT) {
      bestT = t;
      best = b;
    }
  }
  return best;
}

function parseReferenceUpper(ref: string | null | undefined): number | null {
  if (!ref || !ref.trim()) return null;
  const s = ref.replace(/\s+/g, " ").trim();
  const m = s.match(/(\d+[.,]?\d*)\s*[-–]\s*(\d+[.,]?\d*)/);
  if (m) {
    const hi = parseFloat(m[2].replace(",", "."));
    return Number.isFinite(hi) ? hi : null;
  }
  return null;
}

function ulnForLab(
  name: string,
  b: BiomarkerModalRow,
  defaults: { cre: number; enzyme: number; bili: number }
): number | null {
  if (b.critical_high != null && Number.isFinite(b.critical_high)) {
    return b.critical_high;
  }
  const parsed = parseReferenceUpper(b.reference_range);
  if (parsed != null && Number.isFinite(parsed)) return parsed;
  if (biomarkerMatches(name, CRE_ALIASES)) return defaults.cre;
  if (biomarkerMatches(name, AST_ALIASES) || biomarkerMatches(name, ALT_ALIASES)) return defaults.enzyme;
  if (biomarkerMatches(name, BILI_ALIASES)) return defaults.bili;
  return null;
}

function hepatorenalSevere(biomarkers: BiomarkerModalRow[], sinceMs: number, nowMs: number): boolean {
  const mult = 3;
  const defaults = { cre: 1.2, enzyme: 40, bili: 1.2 };
  const labs = [
    { aliases: CRE_ALIASES },
    { aliases: AST_ALIASES },
    { aliases: ALT_ALIASES },
    { aliases: BILI_ALIASES },
  ];
  for (const { aliases } of labs) {
    const b = latestBiomarkerInWindow(biomarkers, aliases, sinceMs, nowMs);
    if (!b || b.value_numeric == null) continue;
    const uln = ulnForLab(b.name, b, defaults);
    if (uln != null && uln > 0 && b.value_numeric >= mult * uln) return true;
  }
  return false;
}

export type SuspensionRiskFactor = {
  label: string;
  points: number;
  detail?: string;
};

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

function isSeverePlus(s: SymptomLogDetail): boolean {
  return s.severity === "severe" || s.severity === "life_threatening";
}

function hasFeverSince(
  vitals: VitalLogRow[],
  symptoms: SymptomLogDetail[],
  feverThresholdC: number,
  sinceMs: number,
  nowMs: number
): boolean {
  for (const v of vitals) {
    const t = new Date(v.logged_at).getTime();
    if (t < sinceMs || t > nowMs) continue;
    if (v.vital_type === "temperature" && v.value_numeric != null && v.value_numeric >= feverThresholdC) {
      return true;
    }
  }
  for (const s of symptoms) {
    const t = new Date(s.logged_at).getTime();
    if (t < sinceMs || t > nowMs) continue;
    if (s.body_temperature != null && s.body_temperature >= feverThresholdC) return true;
  }
  return false;
}

function detectRapidWeightLoss(vitals: VitalLogRow[], sinceMs: number, nowMs: number, pctThreshold: number): boolean {
  const weights = vitals
    .filter(
      (v) =>
        v.vital_type === "weight" &&
        v.value_numeric != null &&
        Number.isFinite(v.value_numeric) &&
        (() => {
          const t = new Date(v.logged_at).getTime();
          return t >= sinceMs && t <= nowMs;
        })()
    )
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
  if (weights.length < 2) return false;
  const first = weights[0].value_numeric!;
  const last = weights[weights.length - 1].value_numeric!;
  if (first <= 0) return false;
  const pct = ((first - last) / first) * 100;
  return pct >= pctThreshold;
}

function symptomInWindow(s: SymptomLogDetail, sinceMs: number, nowMs: number): boolean {
  const t = new Date(s.logged_at).getTime();
  return t >= sinceMs && t <= nowMs;
}

function notesSuggestOralMucositis(notes: string | null | undefined): boolean {
  if (!notes) return false;
  const n = normName(notes);
  return (
    n.includes("boca") ||
    n.includes("oral") ||
    n.includes("mucosite") ||
    n.includes("estomatite") ||
    n.includes("afta")
  );
}

/** Heurística 0–100: maior = maior probabilidade de não estar apto à próxima sessão. */
export function calculateSuspensionRisk(
  patient: PatientRow,
  symptoms: SymptomLogDetail[],
  vitals: VitalLogRow[],
  wearables: WearableSampleRow[],
  feverThresholdC: number,
  biomarkers: BiomarkerModalRow[] = [],
  heuristicRules?: HeuristicRule[]
): { score: number; reasons: string[]; factors: SuspensionRiskFactor[] } {
  const nowMs = Date.now();
  const reasons: string[] = [];
  const factors: SuspensionRiskFactor[] = [];
  let score = 0;
  const rules = heuristicRules;

  const since24h = nowMs - 24 * MS_HOUR;
  const since48h = nowMs - 48 * MS_HOUR;
  const since72h = nowMs - 72 * MS_HOUR;
  const since7d = nowMs - 7 * MS_DAY;

  const ancWindowMs = nowMs - windowHours("anc_critical", rules, 168) * MS_HOUR;
  const pltWindowMs = since7d;
  const hepWindowMs = since7d;

  const latestAnc = latestBiomarkerInWindow(biomarkers, ANC_ALIASES, ancWindowMs, nowMs);
  const ancLow = latestAnc != null && latestAnc.value_numeric != null && latestAnc.value_numeric < 1000;

  const fever24h = hasFeverSince(vitals, symptoms, feverThresholdC, since24h, nowMs);

  let neutropenicFever = false;
  if (fever24h && ancLow) {
    neutropenicFever = true;
    const pts = pointsFor("neutropenic_fever", rules);
    score += pts;
    const label = "Neutropenia febril (24h)";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail:
        `Febre ≥ ${feverThresholdC} °C com neutrófilos < 1.000/mm³ no período recente. Risco de vida — avaliar urgência.`,
    });
  }

  if (!neutropenicFever && ancLow) {
    const pts = pointsFor("anc_critical", rules);
    score += pts;
    const label = "Neutrófilos < 1.000/mm³ (exame recente)";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: latestAnc
        ? `Último ANC: ${latestAnc.value_numeric?.toFixed(0)} /mm³ em ${latestAnc.logged_at.slice(0, 10)}.`
        : "Neutropenia grave.",
    });
  }

  const latestPlt = latestBiomarkerInWindow(biomarkers, PLT_ALIASES, pltWindowMs, nowMs);
  if (latestPlt != null && latestPlt.value_numeric != null && latestPlt.value_numeric < 75000) {
    const pts = pointsFor("platelets_critical", rules);
    score += pts;
    const label = "Plaquetas < 75.000/mm³";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: `Último valor: ${latestPlt.value_numeric.toFixed(0)} /mm³.`,
    });
  }

  if (hepatorenalSevere(biomarkers, hepWindowMs, nowMs)) {
    const pts = pointsFor("hepatorenal_toxicity", rules);
    score += pts;
    const label = "Toxicidade hepática/renal ≥ 3× LSN";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: "Creatinina ou enzimas hepáticas ou bilirrubina ≥ 3× limite superior de referência (exames recentes).",
    });
  }

  if (patient.is_in_nadir) {
    const pts = pointsFor("nadir", rules);
    score += pts;
    const label = "Paciente em janela de nadir";
    reasons.push(label);
    factors.push({ label, points: pts, detail: "Vigilância febril e toxicidade esperada no período pós-quimioterapia." });
  }

  if (!neutropenicFever) {
    const fever48 = hasFeverSince(vitals, symptoms, feverThresholdC, since48h, nowMs);
    if (fever48) {
      const pts = pointsFor("fever_isolated", rules);
      score += pts;
      const label = `Febre ≥ ${feverThresholdC} °C (48h)`;
      reasons.push(label);
      factors.push({
        label,
        points: pts,
        detail: "Febre isolada sem critério laboratorial de neutropenia febril no mesmo período.",
      });
    }
  }

  let diarrheaG3 = false;
  for (const s of symptoms) {
    if (!symptomInWindow(s, since72h, nowMs)) continue;
    if (s.symptom_category !== "diarrhea") continue;
    if ((s.ae_max_grade != null && s.ae_max_grade >= 3) || legacySeverityRank(s) >= 3 || isSeverePlus(s)) {
      diarrheaG3 = true;
      break;
    }
  }
  if (diarrheaG3) {
    const pts = pointsFor("diarrhea_grade3", rules);
    score += pts;
    const label = "Diarreia grau ≥3 (72h)";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: "Diarreia intensa no diário recente (aprox. CTCAE grau 3).",
    });
  }

  let mucositis = false;
  for (const s of symptoms) {
    if (!symptomInWindow(s, since72h, nowMs)) continue;
    const cat = s.symptom_category ?? "";
    if (cat !== "sore_throat" && cat !== "pain") continue;
    if ((s.ae_max_grade != null && s.ae_max_grade >= 3) || notesSuggestOralMucositis(s.notes)) {
      mucositis = true;
      break;
    }
  }
  if (mucositis) {
    const pts = pointsFor("mucositis_severe", rules);
    score += pts;
    const label = "Mucosite / dor oral relevante (72h)";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: "Dor de garganta ou dor com grau elevado ou notas sugestivas de mucosite oral.",
    });
  }

  let nauseaRef = false;
  for (const s of symptoms) {
    if (!symptomInWindow(s, since72h, nowMs)) continue;
    const cat = s.symptom_category ?? "";
    if (cat === "nausea") {
      if ((s.entry_kind === "prd" && (s.nausea_level ?? 0) >= 7) || isSeverePlus(s) || (s.ae_max_grade != null && s.ae_max_grade >= 3)) {
        nauseaRef = true;
        break;
      }
    }
    if (cat === "vomiting") {
      if (legacySeverityRank(s) >= 3 || (s.ae_max_grade != null && s.ae_max_grade >= 3)) {
        nauseaRef = true;
        break;
      }
    }
  }
  if (nauseaRef) {
    const pts = pointsFor("nausea_refractory", rules);
    score += pts;
    const label = "Náusea/vômito intenso (72h)";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: "Escala PRD ≥7 ou gravidade severa em náusea/vômito.",
    });
  }

  let fatigueEx = false;
  for (const s of symptoms) {
    if (!symptomInWindow(s, since72h, nowMs)) continue;
    if (s.symptom_category !== "fatigue") continue;
    if ((s.entry_kind === "prd" && (s.fatigue_level ?? 0) >= 7) || (s.ae_max_grade != null && s.ae_max_grade >= 3)) {
      fatigueEx = true;
      break;
    }
  }
  if (fatigueEx) {
    const pts = pointsFor("fatigue_extreme", rules);
    score += pts;
    const label = "Fadiga extrema (72h)";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: "Fadiga PRD ≥7 ou grau ≥3 no diário.",
    });
  }

  const wlHours = windowHours("weight_loss_rapid", rules, 168);
  const wlSince = nowMs - wlHours * MS_HOUR;
  if (detectRapidWeightLoss(vitals, wlSince, nowMs, 5)) {
    const pts = pointsFor("weight_loss_rapid", rules);
    score += pts;
    const label = `Perda de peso ≥5% (${wlHours / 24}d)`;
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: "Queda rápida de peso corporal entre medições de peso na janela.",
    });
  }

  const since7dWear = since7d;
  const fallEvents = wearables.filter(
    (w) =>
      w.metric === "falls_count" &&
      new Date(w.observed_start).getTime() >= since7dWear &&
      (w.value_numeric ?? 0) > 0
  );
  if (fallEvents.length > 0) {
    const pts = pointsFor("falls", rules);
    score += pts;
    const label = "Queda(s) registrada(s) no período";
    reasons.push(label);
    factors.push({ label, points: pts, detail: "Eventos de queda nos últimos 7 dias (wearable)." });
  }

  const hrvLow = wearables.filter(
    (w) =>
      w.metric === "hrv_sdnn" &&
      new Date(w.observed_start).getTime() >= since72h &&
      w.value_numeric != null &&
      w.value_numeric < 20
  );
  if (hrvLow.length >= 3) {
    const pts = pointsFor("low_hrv", rules);
    score += pts;
    const label = "VFC baixa (possível stress/fadiga)";
    reasons.push(label);
    factors.push({
      label,
      points: pts,
      detail: "Três ou mais medições de VFC (HRV SDNN) abaixo de 20 ms em 72h.",
    });
  }

  if (factors.filter((f) => f.points > 0).length === 0) {
    factors.push({
      label: "Sem fatores que aumentem o score",
      points: 0,
      detail:
        "Nadir, febre, exames laboratoriais, sintomas do diário, quedas e VFC foram considerados nas janelas definidas.",
    });
  }

  return { score: Math.min(100, Math.round(score)), reasons: reasons.slice(0, 8), factors };
}
