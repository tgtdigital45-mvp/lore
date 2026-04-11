import { labelCancerType } from "@/src/i18n/ui";
import { labelTreatmentKind } from "@/src/i18n/treatment";
import { generateBarChartSVG, generateSparklineSVG, generateTreatmentRingsSVG } from "@/src/reports/reportCharts";
import type { TreatmentCycleRow, TreatmentInfusionRow } from "@/src/types/treatment";
import type { NutritionLogRow, VitalLogRow } from "@/src/types/vitalsNutrition";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const LIMIT_SYMPTOMS = 15;
const LIMIT_VITALS = 15;
const LIMIT_NUTRITION = 10;
const LIMIT_MED_DETAIL = 10;
const LIMIT_BIO_METRICS = 15;
const LIMIT_INFUSIONS = 15;

const VITAL_PT: Record<string, string> = {
  temperature: "Temperatura",
  heart_rate: "Freq. cardíaca",
  blood_pressure: "Pressão arterial",
  spo2: "SpO2",
  weight: "Peso",
  glucose: "Glicemia",
};

const NUTR_PT: Record<string, string> = {
  water: "Água",
  coffee: "Café",
  meal: "Refeição",
  calories: "Calorias",
  appetite: "Apetite",
};

export type PatientIdentification = {
  fullName: string | null;
  primaryCancerType: string;
  currentStage: string | null;
  patientCode: string | null;
};

export function sectionPatientIdentification(p: PatientIdentification): string {
  const name = p.fullName?.trim() || "—";
  const cancer = esc(labelCancerType(p.primaryCancerType));
  const stage = p.currentStage ? esc(p.currentStage) : "—";
  const code = p.patientCode ? esc(p.patientCode) : "—";
  return `
<div class="section card">
  <h2 class="section-title">Identificação</h2>
  <table class="info-grid">
    <tr><th>Nome</th><td>${esc(name)}</td></tr>
    <tr><th>Tipo de cancro</th><td>${cancer}</td></tr>
    <tr><th>Estágio</th><td>${stage}</td></tr>
    <tr><th>ID Aura</th><td>${code}</td></tr>
  </table>
</div>`;
}

export function sectionSymptoms(symRows: Record<string, unknown>[]): string {
  if (symRows.length === 0) {
    return `<div class="section"><h2 class="section-title">Sintomas</h2><p class="muted">Sem registos no período.</p></div>`;
  }
  const total = symRows.length;
  const slice = symRows.slice(0, LIMIT_SYMPTOMS);
  let rows = "";
  for (const r of slice) {
    const logged = typeof r.logged_at === "string" ? formatDt(r.logged_at) : "—";
    const kind = r.entry_kind === "prd" ? "PRD (0–10)" : "Legado";
    let detail = "";
    if (r.entry_kind === "prd") {
      detail = `Dor ${r.pain_level} · Náusea ${r.nausea_level} · Fadiga ${r.fatigue_level}`;
      if (r.mood) detail += ` · Humor: ${esc(String(r.mood))}`;
      if (r.notes) detail += ` · ${esc(String(r.notes))}`;
    } else {
      detail = `${esc(String(r.symptom_category ?? ""))} — ${esc(String(r.severity ?? ""))}`;
      if (r.body_temperature != null) detail += ` · ${r.body_temperature} °C`;
    }
    rows += `<tr><td>${esc(logged)}</td><td>${esc(kind)}</td><td>${detail}</td></tr>`;
  }
  const more = total > LIMIT_SYMPTOMS ? `<p class="truncated">… e mais ${total - LIMIT_SYMPTOMS} registo(s) no período</p>` : "";
  return `
<div class="section">
  <h2 class="section-title section-symptoms">Sintomas</h2>
  <table><thead><tr><th>Data</th><th>Tipo</th><th>Detalhe</th></tr></thead><tbody>${rows}</tbody></table>
  ${more}
</div>`;
}

export function sectionVitals(rows: VitalLogRow[]): string {
  if (rows.length === 0) {
    return `<div class="section"><h2 class="section-title">Sinais vitais</h2><p class="muted">Sem registos no período.</p></div>`;
  }
  const total = rows.length;
  const slice = rows.slice(0, LIMIT_VITALS);
  let body = "";
  for (const r of slice) {
    const t = VITAL_PT[r.vital_type] ?? r.vital_type;
    let val = "—";
    if (r.vital_type === "blood_pressure" && r.value_systolic != null && r.value_diastolic != null) {
      val = `${r.value_systolic}/${r.value_diastolic} mmHg`;
    } else if (r.value_numeric != null) {
      val = `${r.value_numeric}${r.unit ? ` ${r.unit}` : ""}`;
    }
    body += `<tr><td>${esc(formatDt(r.logged_at))}</td><td>${esc(t)}</td><td>${esc(val)}</td><td>${r.notes ? esc(r.notes) : "—"}</td></tr>`;
  }
  const more = total > LIMIT_VITALS ? `<p class="truncated">… e mais ${total - LIMIT_VITALS} registo(s) no período</p>` : "";
  return `
<div class="section">
  <h2 class="section-title section-vitals">Sinais vitais</h2>
  <table><thead><tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Notas</th></tr></thead><tbody>${body}</tbody></table>
  ${more}
</div>`;
}

function medLabel(medicationId: string, medMeta: Map<string, { name: string; dosage: string | null }>): string {
  const m = medMeta.get(medicationId);
  const name = m?.name ?? medicationId;
  const dosage = m?.dosage ? String(m.dosage) : "";
  return dosage ? `${name} (${dosage})` : name;
}

export function sectionMedicationLogs(
  medRows: { medication_id: string; scheduled_time: string; taken_time: string | null; status: string }[],
  medMeta: Map<string, { name: string; dosage: string | null }>
): string {
  if (medRows.length === 0) {
    return `<div class="section"><h2 class="section-title">Medicamentos (tomados / agendados)</h2><p class="muted">Sem registos no período.</p></div>`;
  }
  const byMed = new Map<
    string,
    { rows: typeof medRows; taken: number }
  >();
  for (const r of medRows) {
    const cur = byMed.get(r.medication_id) ?? { rows: [], taken: 0 };
    cur.rows.push(r);
    const st = String(r.status ?? "").toLowerCase();
    if (st === "taken" || r.taken_time) cur.taken += 1;
    byMed.set(r.medication_id, cur);
  }

  const barData = [...byMed.entries()]
    .map(([id, v]) => ({ label: medLabel(id, medMeta), count: v.rows.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const barH = Math.min(160, Math.max(72, barData.length * 18 + 24));
  const barSvg = generateBarChartSVG(barData, "#32ADE6", 300, barH);

  const summarySorted = [...byMed.entries()].sort((a, b) => b[1].rows.length - a[1].rows.length);
  let summaryRows = "";
  for (const [id, v] of summarySorted) {
    const total = v.rows.length;
    const taken = v.taken;
    const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
    summaryRows += `<tr><td>${esc(medLabel(id, medMeta))}</td><td>${taken}</td><td>${total}</td><td>${pct}%</td></tr>`;
  }

  const sortedDetail = [...medRows].sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
  const detailSlice = sortedDetail.slice(0, LIMIT_MED_DETAIL);
  let detailBody = "";
  for (const r of detailSlice) {
    const m = medMeta.get(r.medication_id);
    const name = m?.name ?? r.medication_id;
    const dosage = m?.dosage ?? "";
    detailBody += `<tr><td>${esc(formatDt(r.scheduled_time))}</td><td>${r.taken_time ? esc(formatDt(r.taken_time)) : "—"}</td><td>${esc(String(r.status ?? ""))}</td><td>${esc(name)} ${esc(String(dosage))}</td></tr>`;
  }
  const moreDetail =
    medRows.length > LIMIT_MED_DETAIL
      ? `<p class="truncated">… e mais ${medRows.length - LIMIT_MED_DETAIL} registo(s) detalhados no período</p>`
      : "";

  return `
<div class="section">
  <h2 class="section-title section-meds">Medicamentos (tomados / agendados)</h2>
  <p class="muted small">Resumo por medicamento no período (frequência de registos).</p>
  <div class="chart-wrap">${barSvg}</div>
  <table class="compact"><thead><tr><th>Medicamento</th><th>Tomados</th><th>Total</th><th>Adesão</th></tr></thead><tbody>${summaryRows}</tbody></table>
  <h3 class="subsection section-meds-sub">Últimos registos (detalhe)</h3>
  <table class="compact"><thead><tr><th>Agendado</th><th>Tomado</th><th>Estado</th><th>Medicamento</th></tr></thead><tbody>${detailBody}</tbody></table>
  ${moreDetail}
</div>`;
}

export function sectionActiveMedications(meds: { name?: string; dosage?: string | null; frequency_hours?: number; active?: boolean }[]): string {
  const active = meds.filter((m) => m.active);
  if (active.length === 0) {
    return `<div class="section"><h2 class="section-title">Prescrições ativas</h2><p class="muted">Nenhuma prescrição ativa.</p></div>`;
  }
  let rows = "";
  for (const m of active) {
    rows += `<tr><td>${esc(String(m.name ?? ""))}</td><td>${esc(String(m.dosage ?? ""))}</td><td>${m.frequency_hours ?? "—"}</td></tr>`;
  }
  return `
<div class="section">
  <h2 class="section-title section-meds">Prescrições ativas (referência)</h2>
  <table class="compact"><thead><tr><th>Nome</th><th>Dosagem</th><th>A cada (h)</th></tr></thead><tbody>${rows}</tbody></table>
</div>`;
}

export function sectionNutrition(rows: NutritionLogRow[]): string {
  if (rows.length === 0) {
    return `<div class="section"><h2 class="section-title">Nutrição</h2><p class="muted">Sem registos no período.</p></div>`;
  }
  const total = rows.length;
  const slice = rows.slice(0, LIMIT_NUTRITION);
  let body = "";
  for (const r of slice) {
    const type = NUTR_PT[r.log_type] ?? r.log_type;
    let detail = "—";
    if (r.log_type === "water" || r.log_type === "coffee") detail = `${r.quantity ?? 0}`;
    else if (r.log_type === "meal") {
      detail = [r.meal_name, r.calories != null ? `${r.calories} kcal` : null].filter(Boolean).join(" · ") || "—";
    } else if (r.log_type === "calories") detail = r.calories != null ? `${r.calories} kcal` : "—";
    else if (r.log_type === "appetite") detail = r.appetite_level != null ? `${r.appetite_level}/10` : "—";
    body += `<tr><td>${esc(formatDt(r.logged_at))}</td><td>${esc(type)}</td><td>${esc(detail)}</td><td>${r.notes ? esc(r.notes) : "—"}</td></tr>`;
  }
  const more = total > LIMIT_NUTRITION ? `<p class="truncated">… e mais ${total - LIMIT_NUTRITION} registo(s) no período</p>` : "";
  return `
<div class="section">
  <h2 class="section-title section-nutrition">Nutrição</h2>
  <table class="compact"><thead><tr><th>Data</th><th>Tipo</th><th>Detalhe</th><th>Notas</th></tr></thead><tbody>${body}</tbody></table>
  ${more}
</div>`;
}

function treatmentTimeProgress(cycle: TreatmentCycleRow): number {
  const start = new Date(cycle.start_date).getTime();
  const now = Date.now();
  if (Number.isNaN(start)) return 0;
  if (cycle.end_date) {
    const end = new Date(cycle.end_date).getTime();
    if (Number.isNaN(end) || end <= start) return 0;
    return Math.min(1, Math.max(0, (now - start) / (end - start)));
  }
  const estimatedMs = 120 * 24 * 60 * 60 * 1000;
  return Math.min(1, Math.max(0, (now - start) / estimatedMs));
}

export function sectionTreatment(
  cycle: TreatmentCycleRow | null,
  infusionsInPeriod: TreatmentInfusionRow[],
  lastSessionAt: string | null,
  nextScheduledSummary: string | null
): string {
  if (!cycle) {
    return `<div class="section"><h2 class="section-title">Tratamento</h2><p class="muted">Sem ciclo de tratamento activo.</p></div>`;
  }
  const kind = esc(labelTreatmentKind(cycle.treatment_kind ?? "chemotherapy"));
  const protocol = esc(cycle.protocol_name);
  const planned = cycle.planned_sessions ?? 0;
  const done = cycle.completed_sessions ?? 0;
  const sessions =
    cycle.planned_sessions != null ? `${done} / ${cycle.planned_sessions} sessões` : "—";
  const sessionProgress = planned > 0 ? Math.min(1, done / planned) : 0;
  const timeProgress = treatmentTimeProgress(cycle);
  const rings = generateTreatmentRingsSVG({ sessionProgress, timeProgress, size: 112 });

  const lastInf = lastSessionAt ? esc(formatDt(lastSessionAt)) : "—";
  const nextInf = nextScheduledSummary ? esc(nextScheduledSummary) : "—";

  const infSorted = [...infusionsInPeriod].sort((a, b) => new Date(b.session_at).getTime() - new Date(a.session_at).getTime());
  const infTotal = infSorted.length;
  const infSlice = infSorted.slice(0, LIMIT_INFUSIONS);
  let infRows = "";
  for (const inf of infSlice) {
    infRows += `<tr><td>${esc(formatDt(inf.session_at))}</td><td>${esc(inf.status)}</td><td>${inf.weight_kg != null ? esc(String(inf.weight_kg)) : "—"}</td></tr>`;
  }
  const infMore = infTotal > LIMIT_INFUSIONS ? `<p class="truncated">… e mais ${infTotal - LIMIT_INFUSIONS} infusão(ões) no período</p>` : "";
  const infTable =
    infTotal === 0
      ? `<p class="muted">Sem infusões registadas no período.</p>`
      : `<table class="compact"><thead><tr><th>Data sessão</th><th>Estado</th><th>Peso (kg)</th></tr></thead><tbody>${infRows}</tbody></table>${infMore}`;

  return `
<div class="section">
  <h2 class="section-title section-treatment">Tratamento</h2>
  <div class="treatment-row">
    <div class="treatment-rings">${rings}</div>
    <table class="info-grid treatment-info">
      <tr><th>Modalidade</th><td>${kind}</td></tr>
      <tr><th>Protocolo</th><td>${protocol}</td></tr>
      <tr><th>Sessões</th><td>${esc(sessions)}</td></tr>
      <tr><th>Última infusão</th><td>${lastInf}</td></tr>
      <tr><th>Próxima (agendada)</th><td>${nextInf}</td></tr>
    </table>
  </div>
  <h3 class="subsection section-treatment-sub">Infusões no período</h3>
  ${infTable}
</div>`;
}

export type BiomarkerRow = {
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  logged_at: string;
};

function normBioName(name: string): string {
  return name.trim().toLowerCase();
}

function numericFromRow(r: BiomarkerRow): number | null {
  if (r.value_numeric != null && Number.isFinite(Number(r.value_numeric))) return Number(r.value_numeric);
  return null;
}

export function sectionBiomarkers(rowsAll: BiomarkerRow[], periodFromIso: string): string {
  if (rowsAll.length === 0) {
    return `<div class="section"><h2 class="section-title">Biomarcadores / exames</h2><p class="muted">Sem registos.</p></div>`;
  }
  const periodMs = new Date(periodFromIso).getTime();
  const byName = new Map<string, BiomarkerRow[]>();
  for (const r of rowsAll) {
    const k = normBioName(r.name);
    const arr = byName.get(k) ?? [];
    arr.push(r);
    byName.set(k, arr);
  }

  const inPeriodKeys = new Set<string>();
  for (const [k, arr] of byName) {
    if (arr.some((x) => new Date(x.logged_at).getTime() >= periodMs)) inPeriodKeys.add(k);
  }

  if (inPeriodKeys.size === 0) {
    return `<div class="section"><h2 class="section-title section-bio">Biomarcadores / exames de sangue</h2><p class="muted">Sem registos no período seleccionado (histórico disponível para tendências).</p></div>`;
  }

  const scored = [...inPeriodKeys].map((k) => {
    const arr = byName.get(k) ?? [];
    const latest = Math.max(...arr.map((x) => new Date(x.logged_at).getTime()));
    const displayName = arr.slice().sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0]?.name ?? k;
    return { k, latest, displayName };
  });
  scored.sort((a, b) => b.latest - a.latest);
  const picked = scored.slice(0, LIMIT_BIO_METRICS);

  const cardHtml: string[] = [];
  for (const { k, displayName } of picked) {
    const series = (byName.get(k) ?? []).slice().sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
    const nums = series.map(numericFromRow).filter((n): n is number => n != null);
    const last = series[series.length - 1];
    let valStr = "—";
    if (last) {
      const n = numericFromRow(last);
      if (n != null) valStr = `${n}${last.unit ? ` ${last.unit}` : ""}`;
      else if (last.value_text != null && String(last.value_text).trim() !== "")
        valStr = `${String(last.value_text).trim()}${last.unit ? ` ${last.unit}` : ""}`;
    }
    let trend = "";
    if (nums.length >= 2) {
      const delta = nums[nums.length - 1] - nums[nums.length - 2];
      const sign = delta > 0 ? "+" : "";
      const dec = Math.abs(delta) >= 10 ? 1 : 2;
      trend = `<span class="bio-trend">${sign}${delta.toFixed(dec)}</span>`;
    }
    const spark =
      nums.length >= 2
        ? generateSparklineSVG(nums, "#5856D6", 120, 36, 1.5)
        : `<div class="bio-spark-placeholder">—</div>`;
    cardHtml.push(`
    <div class="bio-card">
      <div class="bio-card-head">${esc(displayName)}</div>
      <div class="bio-spark">${spark}</div>
      <div class="bio-value">${esc(valStr)} ${trend}</div>
      <div class="bio-meta">${esc(formatDt(last?.logged_at ?? ""))}</div>
    </div>`);
  }

  let bioRows = "";
  for (let i = 0; i < cardHtml.length; i += 2) {
    const a = cardHtml[i];
    const b = cardHtml[i + 1] ?? '<div class="bio-card bio-card-empty"></div>';
    bioRows += `<div class="bio-row">${a}${b}</div>`;
  }

  return `
<div class="section">
  <h2 class="section-title section-bio">Biomarcadores / exames de sangue</h2>
  <p class="muted small">Tendências com base no histórico registado; destaque às métricas com actividade no período do relatório.</p>
  <div class="bio-grid">${bioRows}</div>
</div>`;
}
