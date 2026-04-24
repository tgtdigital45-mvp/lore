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

function section(html: string, extraClass = ""): string {
  return `<section class="no-break${extraClass ? ` ${extraClass}` : ""}">${html}</section>`;
}

function h2(t: string): string {
  return `<h2>${esc(t)}</h2>`;
}

function h3(t: string): string {
  return `<h3>${esc(t)}</h3>`;
}

function table(head: string[], rows: string[][]): string {
  const th = head.map((c) => `<th>${esc(c)}</th>`).join("");
  const tr = rows
    .map((r) => `<tr class="no-break">${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

function prdMax(s: SymptomLogDetail): number {
  if (s.entry_kind === "prd") {
    return Math.max(s.pain_level ?? 0, s.nausea_level ?? 0, s.fatigue_level ?? 0);
  }
  return 0;
}

function severityCell(s: SymptomLogDetail): string {
  if (s.entry_kind === "prd") {
    const m = prdMax(s);
    if (m >= 7) return `<span class="tag-severe">${esc("Grave")}</span>`;
    if (m >= 4) return `<span class="tag-mild">${esc("Moderado")}</span>`;
    return `<span class="tag-mild">${esc("Suave")}</span>`;
  }
  const sev = s.severity ?? "";
  const label = (SEVERITY_PT[sev] ?? sev).trim() || "—";
  if (sev === "severe" || sev === "life_threatening") {
    return `<span class="tag-severe">${esc(label)}</span>`;
  }
  if (sev === "moderate" || sev === "mild" || sev === "present") {
    return `<span class="tag-mild">${esc(label)}</span>`;
  }
  return esc(label);
}

function mergedVitalsSymptomsTable(
  data: DossierReportPayload,
  include: Record<DossierReportSectionId, boolean>
): string | null {
  const wantVitals = include.sinais_vitais;
  const wantSymptoms = include.toxicidade
    ? data.symptoms.slice(0, 60)
    : include.alertas
      ? data.alertSymptoms
      : [];
  if (!wantVitals && wantSymptoms.length === 0) return null;

  type Item =
    | { kind: "v"; v: VitalLogRow; t: number }
    | { kind: "s"; s: SymptomLogDetail; t: number };

  const items: Item[] = [];
  if (wantVitals) {
    for (const v of data.vitals.slice(0, 80)) {
      items.push({ kind: "v", v, t: new Date(v.logged_at).getTime() });
    }
  }
  for (const s of wantSymptoms) {
    items.push({ kind: "s", s, t: new Date(s.logged_at).getTime() });
  }
  items.sort((a, b) => b.t - a.t);
  const limited = items.slice(0, 100);

  const rowsHtml = limited
    .map((it) => {
      if (it.kind === "v") {
        const v = it.v;
        const typeLabel = VITAL_TYPE_PT[v.vital_type] ?? v.vital_type;
        const val =
          v.vital_type === "blood_pressure" && v.value_systolic != null && v.value_diastolic != null
            ? `${v.value_systolic}/${v.value_diastolic} mmHg`
            : v.value_numeric != null
              ? `${v.value_numeric}${v.unit ? ` ${v.unit}` : ""}`
              : "—";
        const detail = v.notes?.trim()
          ? val !== "—"
            ? `${esc(val)} · ${esc(v.notes.trim().slice(0, 140))}`
            : esc(v.notes.trim().slice(0, 160))
          : esc(val);
        const feverAlert =
          v.vital_type === "temperature" &&
          v.value_numeric != null &&
          v.value_numeric >= data.feverThresholdC;
        const trClass = feverAlert ? " data-row-alert" : "";
        const grav = feverAlert
          ? `<span class="tag-severe">${esc("Alerta")}</span>`
          : "—";
        return `<tr class="no-break${trClass}"><td>${esc(formatPtDateTime(v.logged_at))}</td><td>${esc(`Sinal vital: ${typeLabel}`)}</td><td>${detail}</td><td>${grav}</td></tr>`;
      }
      const s = it.s;
      const cat =
        s.entry_kind === "prd"
          ? "Escala PRD"
          : SYMPTOM_CATEGORY_PT[s.symptom_category ?? ""] ?? s.symptom_category ?? "—";
      const det =
        s.entry_kind === "prd"
          ? `Dor ${s.pain_level ?? "—"} | Náusea ${s.nausea_level ?? "—"} | Fadiga ${s.fatigue_level ?? "—"}`
          : (s.notes?.trim() ? s.notes.trim().slice(0, 200) : SEVERITY_PT[s.severity ?? ""] ?? s.severity ?? "—");
      const trClass =
        s.requires_action || s.severity === "severe" || s.severity === "life_threatening"
          ? " data-row-alert"
          : "";
      return `<tr class="no-break${trClass}"><td>${esc(formatPtDateTime(s.logged_at))}</td><td>${esc(`Sintoma: ${cat}`)}</td><td>${esc(det)}</td><td>${severityCell(s)}</td></tr>`;
    })
    .join("");

  const head = ["Data", "Registro", "Valor / detalhe", "Gravidade"]
    .map((c) => `<th>${esc(c)}</th>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function dossierReportStyles(): string {
  return `
        :root {
            --primary-color: #2563eb;
            --primary-light: #eff6ff;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --danger-color: #ef4444;
            --danger-light: #fef2f2;
            --border-color: #e2e8f0;
            --bg-gray: #f8fafc;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        @page {
            size: A4;
            margin: 1.5cm 2cm;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background-color: white !important;
            }
            .no-break {
                page-break-inside: avoid;
            }
            .page-break {
                page-break-before: always;
            }
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: var(--font-family);
            color: var(--text-main);
            font-size: 11pt;
            line-height: 1.5;
            background-color: #f0f2f5;
        }
        .document-container {
            max-width: 21cm;
            margin: 0 auto;
            background: white;
            padding: 2cm;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }
        .logo-placeholder {
            width: 140px;
            height: 50px;
            background-color: var(--primary-light);
            border: 1px dashed var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary-color);
            font-weight: 600;
            font-size: 0.9rem;
            border-radius: 4px;
        }
        .header-meta {
            text-align: right;
        }
        .header-meta h1 {
            font-size: 1.5rem;
            color: var(--primary-color);
            margin-bottom: 0.25rem;
        }
        .header-meta p {
            font-size: 0.85rem;
            color: var(--text-muted);
        }
        .badge-internal {
            display: inline-block;
            background: var(--bg-gray);
            border: 1px solid var(--border-color);
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-top: 0.5rem;
        }
        section {
            margin-bottom: 2rem;
        }
        h2 {
            font-size: 1.25rem;
            color: var(--text-main);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        h3 {
            font-size: 1rem;
            color: var(--text-muted);
            font-weight: 600;
            margin: 1rem 0 0.5rem;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
        }
        .info-card {
            background-color: var(--bg-gray);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.25rem;
        }
        .info-row {
            display: flex;
            margin-bottom: 0.5rem;
        }
        .info-row:last-child {
            margin-bottom: 0;
        }
        .info-label {
            font-weight: 600;
            color: var(--text-muted);
            width: 140px;
            flex-shrink: 0;
        }
        .info-value {
            font-weight: 500;
            color: var(--text-main);
        }
        .fever-highlight {
            color: var(--danger-color);
            font-weight: bold;
        }
        .alert-box {
            background-color: var(--danger-light);
            border-left: 4px solid var(--danger-color);
            padding: 1.25rem;
            border-radius: 0 8px 8px 0;
        }
        .alert-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .alert-title {
            color: var(--danger-color);
            font-weight: 700;
            font-size: 1.2rem;
        }
        .alert-score {
            background: var(--danger-color);
            color: white;
            padding: 0.4rem 1rem;
            border-radius: 20px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        .alert-list {
            list-style-type: none;
        }
        .alert-list li {
            position: relative;
            padding-left: 1.5rem;
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
        }
        .alert-list li::before {
            content: "•";
            color: var(--danger-color);
            font-weight: bold;
            position: absolute;
            left: 0;
            font-size: 1.2rem;
            line-height: 1;
        }
        .alert-points {
            font-weight: bold;
            color: var(--danger-color);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }
        th {
            background-color: var(--bg-gray);
            color: var(--text-muted);
            font-weight: 600;
            text-align: left;
            padding: 0.75rem 1rem;
            border-top: 1px solid var(--border-color);
            border-bottom: 2px solid var(--border-color);
        }
        td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border-color);
            vertical-align: top;
        }
        tbody tr:nth-child(even):not(.data-row-alert) {
            background-color: #fafbfc;
        }
        tr.data-row-alert td {
            color: var(--danger-color);
            font-weight: 600;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-muted { color: var(--text-muted); }
        .tag-severe {
            background-color: var(--danger-light);
            color: var(--danger-color);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        .tag-mild {
            background-color: #fef9c3;
            color: #ca8a04;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
        }
        .note { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem; }
        .confidential-banner {
            background: #fef2f2;
            border: 2px solid #b91c1c;
            color: #7f1d1d;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 1rem;
        }
        .audit-footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-color);
            font-size: 0.75rem;
            color: var(--text-muted);
        }
        @media print {
            body::after {
                content: "CONFIDENCIAL";
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 5rem;
                color: rgba(185, 28, 28, 0.06);
                z-index: 9999;
                pointer-events: none;
                font-weight: 800;
            }
        }
`;
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

function formatFactorHtml(f: SuspensionRiskFactor): string {
  const pts =
    f.points > 0 ? `<span class="alert-points">(${f.points} pts)</span> ` : "";
  const rest = f.detail ? ` <strong>${esc(f.label)}:</strong> ${esc(f.detail)}` : ` <strong>${esc(f.label)}</strong>`;
  return `<li>${pts}${rest}</li>`;
}

export type DossierReportAuditMeta = {
  /** Nome do profissional que gerou o relatório (auditoria). */
  staffName: string;
  /** Rótulo do sistema (ex.: Aura OncoCare). */
  systemLabel?: string;
};

export function buildDossierReportHtml(
  include: Record<DossierReportSectionId, boolean>,
  data: DossierReportPayload,
  audit?: DossierReportAuditMeta
): string {
  const cancer = CANCER_PT[data.cancerKey] ?? data.cancerKey;
  const generated = formatPtDateTime(new Date().toISOString());
  const stageLabel = data.stage?.trim() ? esc(data.stage) : esc("—");
  const staff = esc((audit?.staffName ?? "—").trim() || "—");
  const sys = esc(audit?.systemLabel ?? "Aura OncoCare Hospital");

  const parts: string[] = [];

  parts.push(`<div class="document-container">`);

  parts.push(`<div class="confidential-banner" role="note">
        ${esc("⚠ DOCUMENTO CONFIDENCIAL — USO INTERNO EXCLUSIVO DA EQUIPE CLÍNICA")}
    </div>`);

  parts.push(`<header class="report-header">
        <div class="logo-placeholder">${esc("Aura Onco")}</div>
        <div class="header-meta">
            <h1>${esc("Relatório clínico")}</h1>
            <p><strong>${esc("Dossiê Aura")}</strong> — ${esc("Gerado em")} ${esc(generated)}</p>
            <p class="note">${esc("Auditoria:")} ${esc("gerado por")} <strong>${staff}</strong> · ${esc("sistema")} ${sys}</p>
            <span class="badge-internal">${esc("Uso interno")}</span>
        </div>
    </header>`);

  if (include.identificacao) {
    parts.push(
      section(
        `${h2("Identificação do paciente")}
        <div class="info-card">
            <div class="info-grid">
                <div>
                    <div class="info-row"><span class="info-label">${esc("Nome:")}</span><span class="info-value">${esc(data.patientName)}</span></div>
                    <div class="info-row"><span class="info-label">${esc("ID / código:")}</span><span class="info-value">${esc(data.patientCode)}</span></div>
                    <div class="info-row"><span class="info-label">${esc("Idade:")}</span><span class="info-value">${esc(data.ageLabel)}</span></div>
                </div>
                <div>
                    <div class="info-row"><span class="info-label">${esc("Diagnóstico:")}</span><span class="info-value">${esc(cancer)}</span></div>
                    <div class="info-row"><span class="info-label">${esc("Estágio:")}</span><span class="info-value">${stageLabel}</span></div>
                    <div class="info-row"><span class="info-label">${esc("Nadir (vigilância):")}</span><span class="info-value">${data.isInNadir ? esc("Sim") : esc("Não")}</span></div>
                    <div class="info-row"><span class="info-label">${esc("Limiar de febre:")}</span><span class="info-value fever-highlight">${esc(String(data.feverThresholdC))} °C</span></div>
                </div>
            </div>
        </div>`
      )
    );
  }

  if (include.risco_suspensao) {
    const list = data.suspensionFactors.map((f) => formatFactorHtml(f)).join("");
    parts.push(
      section(
        `<div class="alert-box">
            <div class="alert-header">
                <span class="alert-title">${esc("Risco de suspensão (heurística)")}</span>
                <span class="alert-score">${esc("Score:")} ${data.suspensionScore} / 100</span>
            </div>
            <ul class="alert-list">${list || `<li>${esc("—")}</li>`}</ul>
        </div>`
      )
    );
  }

  const merged = mergedVitalsSymptomsTable(data, include);
  if (merged) {
    parts.push(
      section(
        `${h2("Sinais vitais e alertas recentes")}
        <p class="note">${esc("Últimos registros na app (até 100 linhas, ordenados por data).")}</p>
        ${merged}`
      )
    );
  }

  const hasBlocksBeforeExames =
    include.identificacao || include.risco_suspensao || merged !== null;

  if (include.exames) {
    if (hasBlocksBeforeExames) {
      parts.push(`<div class="page-break"></div>`);
    }
    const docRows = data.medicalDocs.map((d) => [
      esc(getDocumentTitle(d)),
      esc(formatExamDayPt(examDisplayDateIso(d))),
      `<span class="text-muted">${esc(formatPtDateTime(d.uploaded_at))}</span>`,
    ]);
    parts.push(
      section(
        `${h2("Documentos e exames registrados")}
        ${
          docRows.length
            ? `<table>
            <thead><tr>
              <th>${esc("Documento")}</th>
              <th class="text-center">${esc("Data do exame")}</th>
              <th class="text-center">${esc("Registro no app")}</th>
            </tr></thead>
            <tbody>${docRows
              .map(
                (r) =>
                  `<tr class="no-break"><td><strong>${r[0]}</strong></td><td class="text-center">${r[1]}</td><td class="text-center">${r[2]}</td></tr>`
              )
              .join("")}</tbody></table>`
            : `<p class="note">${esc("Sem documentos.")}</p>`
        }`
      )
    );

    const bioRows = data.biomarkers.slice(0, 120).map((b) => [
      esc(formatPtDateLong(b.logged_at)),
      esc(b.name),
      esc(formatBiomarkerValue(b)),
      esc(b.unit ?? "—"),
    ]);
    parts.push(
      section(
        `${h2("Histórico de biomarcadores")}
        ${
          bioRows.length
            ? `<table>
            <thead><tr>
              <th>${esc("Data da coleta")}</th>
              <th>${esc("Marcador")}</th>
              <th class="text-right">${esc("Valor")}</th>
              <th>${esc("Unidade")}</th>
            </tr></thead>
            <tbody>${bioRows
              .map(
                (r) =>
                  `<tr class="no-break"><td>${r[0]}</td><td>${r[1]}</td><td class="text-right">${r[2]}</td><td>${r[3]}</td></tr>`
              )
              .join("")}</tbody></table>`
            : `<p class="note">${esc("Sem biomarcadores.")}</p>`
        }`
      )
    );
  }

  if (include.medicamentos) {
    const catRows = data.medications.map((m) => {
      const name = m.display_name?.trim() || m.name;
      return [
        esc(name),
        esc(m.dosage ?? "—"),
        esc(m.active ? "Ativo" : "Inativo"),
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
        ${h3("Cadastro")}
        ${catRows.length ? table(["Medicamento", "Dose", "Estado", "Notas"], catRows) : `<p class="note">${esc("Sem medicamentos cadastrados.")}</p>`}
        ${h3("Tomas")}
        ${logRows.length ? table(["Quando", "Medicamento", "Qtd", "Notas"], logRows) : `<p class="note">${esc("Sem registros de toma.")}</p>`}`
      )
    );
  }

  if (include.diario) {
    const sym = [...data.symptoms].slice(0, 100);
    const rows = sym.map((s) => {
      const cat =
        s.entry_kind === "prd" ? "PRD" : SYMPTOM_CATEGORY_PT[s.symptom_category ?? ""] ?? s.symptom_category ?? "—";
      return [esc(formatPtDateTime(s.logged_at)), esc(cat), esc(s.notes?.trim()?.slice(0, 100) ?? "—")];
    });
    parts.push(
      section(
        `${h2("Diário de sintomas (lista)")}
        ${rows.length ? table(["Data", "Tipo", "Notas"], rows) : `<p class="note">${esc("Sem entradas.")}</p>`}`
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
        ${rows.length ? table(["Data", "Tipo", "Resumo"], rows) : `<p class="note">${esc("Sem registros nutricionais.")}</p>`}`
      )
    );
  }

  parts.push(`<footer class="audit-footer">
        ${esc("Confidencialidade:")} ${esc("este documento contém informação de saúde sensível (LGPD/HIPAA). Impressão e partilha apenas para fins assistenciais autorizados.")}
        <br/><span>${esc("Responsável pela geração:")} ${staff} · ${esc(generated)} · ${sys}</span>
    </footer>`);

  parts.push(`</div>`);

  const body = parts.join("\n");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${esc(`Relatório clínico — ${data.patientName}`)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>${dossierReportStyles()}</style>
</head>
<body>
${body}
</body>
</html>`;
}
