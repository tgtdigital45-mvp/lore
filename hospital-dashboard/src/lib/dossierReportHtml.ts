import {
  CANCER_PT,
  NUTRITION_LOG_TYPE_PT,
  SEVERITY_PT,
  SYMPTOM_CATEGORY_PT,
  VITAL_TYPE_PT,
} from "@/constants/dashboardLabels";
import { formatBiomarkerValue, formatPtDateLong, formatPtDateTime } from "@/lib/dashboardFormat";
import { examDisplayDateIso } from "@/lib/examDisplayDate";
import { formatExamDayPt, getDocumentTitle } from "@/lib/medicalDocumentMeta";
import { medicationLogWhenIso, medicationNameFromLog } from "@/lib/patientModalHelpers";
import type { SuspensionRiskFactor } from "@/lib/suspensionRisk";
import type {
  BiomarkerModalRow,
  MedicalDocModalRow,
  MedicationLogRow,
  MedicationRow,
  NutritionLogRow,
  SymptomLogDetail,
  VitalLogRow,
} from "@/types/dashboard";

export type DossierReportSectionId =
  | "identificacao"
  | "sinais_vitais"
  | "toxicidade"
  | "risco_suspensao"
  | "alertas"
  | "exames"
  | "medicamentos"
  | "diario"
  | "nutricao";

export const DOSSIER_REPORT_SECTION_OPTIONS: { id: DossierReportSectionId; label: string }[] = [
  { id: "identificacao", label: "Identificação do paciente" },
  { id: "sinais_vitais", label: "Sinais vitais" },
  { id: "toxicidade", label: "Sintomas / toxicidade (resumo)" },
  { id: "risco_suspensao", label: "Risco de suspensão" },
  { id: "alertas", label: "Alertas clínicos (triagem)" },
  { id: "exames", label: "Exames e biomarcadores" },
  { id: "medicamentos", label: "Medicação (cadastro e tomas)" },
  { id: "diario", label: "Diário de sintomas (lista)" },
  { id: "nutricao", label: "Nutrição e hábitos" },
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function section(html: string): string {
  return `<section class="sec">${html}</section>`;
}

function h2(t: string): string {
  return `<h2>${esc(t)}</h2>`;
}

function table(head: string[], rows: string[][]): string {
  const th = head.map((c) => `<th>${esc(c)}</th>`).join("");
  const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

export type DossierReportPayload = {
  patientName: string;
  patientCode: string;
  ageLabel: string;
  cancerKey: string;
  stage: string | null;
  isInNadir: boolean;
  feverThresholdC: number;
  vitals: VitalLogRow[];
  symptoms: SymptomLogDetail[];
  suspensionScore: number;
  suspensionFactors: SuspensionRiskFactor[];
  alertSymptoms: SymptomLogDetail[];
  medicalDocs: MedicalDocModalRow[];
  biomarkers: BiomarkerModalRow[];
  medications: MedicationRow[];
  medicationLogs: MedicationLogRow[];
  nutritionLogs: NutritionLogRow[];
};

export function buildDossierReportHtml(
  include: Record<DossierReportSectionId, boolean>,
  data: DossierReportPayload
): string {
  const cancer = CANCER_PT[data.cancerKey] ?? data.cancerKey;
  const generated = formatPtDateTime(new Date().toISOString());

  const parts: string[] = [];

  parts.push(
    `<header class="hdr"><h1>${esc("Relatório clínico — Dossiê Aura")}</h1><p class="meta">Gerado em ${esc(generated)} · Uso interno</p></header>`
  );

  if (include.identificacao) {
    parts.push(
      section(
        `${h2("Identificação")}
        <dl class="dl">
          <dt>Nome</dt><dd>${esc(data.patientName)}</dd>
          <dt>ID / código</dt><dd>${esc(data.patientCode)}</dd>
          <dt>Idade</dt><dd>${esc(data.ageLabel)}</dd>
          <dt>Diagnóstico (tipo)</dt><dd>${esc(cancer)}</dd>
          <dt>Estágio</dt><dd>${esc(data.stage ?? "—")}</dd>
          <dt>Nadir (vigilância)</dt><dd>${data.isInNadir ? "Sim" : "Não"}</dd>
          <dt>Limiar de febre (triagem)</dt><dd>${esc(String(data.feverThresholdC))} °C</dd>
        </dl>`
      )
    );
  }

  if (include.sinais_vitais) {
    const vit = [...data.vitals].slice(0, 80);
    const rows = vit.map((v) => [
      esc(formatPtDateTime(v.logged_at)),
      esc(VITAL_TYPE_PT[v.vital_type] ?? v.vital_type),
      esc(
        v.vital_type === "blood_pressure" && v.value_systolic != null && v.value_diastolic != null
          ? `${v.value_systolic}/${v.value_diastolic} mmHg`
          : v.value_numeric != null
            ? `${v.value_numeric}${v.unit ? ` ${v.unit}` : ""}`
            : "—"
      ),
      esc(v.notes?.trim() ? v.notes.trim().slice(0, 120) : "—"),
    ]);
    parts.push(
      section(
        `${h2("Sinais vitais")}
        <p class="note">Últimos registros na app (até 80 linhas).</p>
        ${rows.length ? table(["Data", "Tipo", "Valor", "Notas"], rows) : "<p>Sem registros.</p>"}`
      )
    );
  }

  if (include.toxicidade) {
    const sym = [...data.symptoms].slice(0, 60);
    const rows = sym.map((s) => {
      const cat = s.entry_kind === "prd" ? "Escala PRD" : SYMPTOM_CATEGORY_PT[s.symptom_category ?? ""] ?? s.symptom_category ?? "—";
      const det =
        s.entry_kind === "prd"
          ? `Dor ${s.pain_level ?? "—"} · Náusea ${s.nausea_level ?? "—"} · Fadiga ${s.fatigue_level ?? "—"}`
          : `${SEVERITY_PT[s.severity ?? ""] ?? s.severity ?? "—"}`;
      return [esc(formatPtDateTime(s.logged_at)), esc(cat), esc(det)];
    });
    parts.push(
      section(
        `${h2("Sintomas e toxicidade")}
        ${rows.length ? table(["Data", "Categoria", "Detalhe"], rows) : "<p>Sem sintomas registrados.</p>"}`
      )
    );
  }

  if (include.risco_suspensao) {
    const list = data.suspensionFactors
      .map(
        (f) =>
          `<li><strong>${esc(f.label)}</strong> ${f.points > 0 ? `(${f.points} pts)` : ""}${f.detail ? `<br/><span class="sub">${esc(f.detail)}</span>` : ""}</li>`
      )
      .join("");
    parts.push(
      section(
        `${h2("Risco de suspensão (heurística)")}
        <p class="score">Score: <strong>${data.suspensionScore}</strong> / 100</p>
        <ul class="factors">${list || "<li>—</li>"}</ul>`
      )
    );
  }

  if (include.alertas) {
    const rows = data.alertSymptoms.map((a) => [
      esc(formatPtDateTime(a.logged_at)),
      esc(SYMPTOM_CATEGORY_PT[a.symptom_category ?? ""] ?? a.symptom_category ?? "—"),
      esc(a.severity ?? "—"),
    ]);
    parts.push(
      section(
        `${h2("Alertas clínicos (triagem recente)")}
        ${rows.length ? table(["Data", "Categoria", "Gravidade"], rows) : "<p>Sem alertas ativos na seleção.</p>"}`
      )
    );
  }

  if (include.exames) {
    const docRows = data.medicalDocs.map((d) => [
      esc(getDocumentTitle(d)),
      esc(formatExamDayPt(examDisplayDateIso(d))),
      esc(formatPtDateTime(d.uploaded_at)),
    ]);
    const bioRows = data.biomarkers.slice(0, 120).map((b) => [
      esc(formatPtDateTime(b.logged_at)),
      esc(b.name),
      esc(formatBiomarkerValue(b)),
      esc(b.unit ?? "—"),
    ]);
    parts.push(
      section(
        `${h2("Exames")}
        <h3>Documentos</h3>
        ${docRows.length ? table(["Documento", "Data do exame", "Registo na app"], docRows) : "<p>Sem documentos.</p>"}
        <h3>Biomarcadores</h3>
        ${bioRows.length ? table(["Data", "Marcador", "Valor", "Un."], bioRows) : "<p>Sem biomarcadores.</p>"}`
      )
    );
  }

  if (include.medicamentos) {
    const catRows = data.medications.map((m) => {
      const name = m.display_name?.trim() || m.name;
      return [
        esc(name),
        esc(m.dosage ?? "—"),
        m.active ? "Ativo" : "Inativo",
        esc(m.notes?.trim()?.slice(0, 80) ?? "—"),
      ];
    });
    const logRows = data.medicationLogs.map((m) => {
      const w = medicationLogWhenIso(m);
      return [
        w ? esc(formatPtDateTime(w)) : "—",
        esc(medicationNameFromLog(m)),
        esc(String(m.quantity ?? "—")),
        esc(m.notes?.trim()?.slice(0, 60) ?? "—"),
      ];
    });
    parts.push(
      section(
        `${h2("Medicação")}
        <h3>Cadastro</h3>
        ${catRows.length ? table(["Medicamento", "Dose", "Estado", "Notas"], catRows) : "<p>Sem medicamentos cadastrados.</p>"}
        <h3>Tomas</h3>
        ${logRows.length ? table(["Quando", "Medicamento", "Qtd", "Notas"], logRows) : "<p>Sem registros de toma.</p>"}`
      )
    );
  }

  if (include.diario) {
    const sym = [...data.symptoms].slice(0, 100);
    const rows = sym.map((s) => {
      const cat = s.entry_kind === "prd" ? "PRD" : SYMPTOM_CATEGORY_PT[s.symptom_category ?? ""] ?? s.symptom_category ?? "—";
      return [esc(formatPtDateTime(s.logged_at)), esc(cat), esc(s.notes?.trim()?.slice(0, 100) ?? "—")];
    });
    parts.push(
      section(
        `${h2("Diário de sintomas (lista)")}
        ${rows.length ? table(["Data", "Tipo", "Notas"], rows) : "<p>Sem entradas.</p>"}`
      )
    );
  }

  if (include.nutricao) {
    const rows = data.nutritionLogs.map((n) => [
      esc(formatPtDateLong(n.logged_at)),
      esc(NUTRITION_LOG_TYPE_PT[n.log_type] ?? n.log_type),
      esc(
        [n.meal_name, n.calories != null ? `${n.calories} kcal` : null, n.appetite_level != null ? `Apetite ${n.appetite_level}/10` : null]
          .filter(Boolean)
          .join(" · ") || "—"
      ),
    ]);
    parts.push(
      section(
        `${h2("Nutrição e hábitos")}
        ${rows.length ? table(["Data", "Tipo", "Resumo"], rows) : "<p>Sem registros nutricionais.</p>"}`
      )
    );
  }

  const body = parts.join("");
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>${esc(`Relatório — ${data.patientName}`)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, Segoe UI, sans-serif; font-size: 11pt; color: #111; margin: 16mm; line-height: 1.45; }
  .hdr h1 { font-size: 18pt; margin: 0 0 8px; }
  .meta { color: #555; font-size: 10pt; margin: 0; }
  .sec { margin-bottom: 20px; page-break-inside: avoid; }
  h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 16px 0 10px; }
  h3 { font-size: 11pt; margin: 12px 0 6px; color: #333; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; }
  .dl { display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; margin: 0; }
  .dl dt { font-weight: 700; color: #444; }
  .dl dd { margin: 0; }
  .note { font-size: 9.5pt; color: #555; }
  .score { font-size: 12pt; }
  .factors { margin: 0; padding-left: 18px; }
  .factors li { margin-bottom: 8px; }
  .sub { font-size: 9.5pt; color: #444; }
  @media print { body { margin: 12mm; } }
</style></head><body>${body}</body></html>`;
}
