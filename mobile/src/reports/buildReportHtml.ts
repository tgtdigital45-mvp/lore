import type { TreatmentCycleRow, TreatmentInfusionRow } from "@/src/types/treatment";
import type { NutritionLogRow, VitalLogRow } from "@/src/types/vitalsNutrition";
import {
  sectionActiveMedications,
  sectionBiomarkers,
  type BiomarkerRow,
  sectionMedicationLogs,
  sectionNutrition,
  sectionPatientIdentification,
  type PatientIdentification,
  sectionSymptoms,
  sectionTreatment,
  sectionVitals,
} from "@/src/reports/reportSections";

export type ReportSectionFlags = {
  header: boolean;
  symptoms: boolean;
  vitals: boolean;
  medsTaken: boolean;
  medsActive: boolean;
  nutrition: boolean;
  treatment: boolean;
  biomarkers: boolean;
};

export const DEFAULT_REPORT_FLAGS: ReportSectionFlags = {
  header: true,
  symptoms: true,
  vitals: true,
  medsTaken: true,
  medsActive: true,
  nutrition: true,
  treatment: true,
  biomarkers: true,
};

export type ReportHtmlPayload = {
  days: number;
  generatedAt: Date;
  flags: ReportSectionFlags;
  patient: PatientIdentification | null;
  symptomRows: Record<string, unknown>[];
  vitalRows: VitalLogRow[];
  medLogs: { medication_id: string; scheduled_time: string; taken_time: string | null; status: string }[];
  medMeta: Map<string, { name: string; dosage: string | null }>;
  medications: { name?: string; dosage?: string | null; frequency_hours?: number; active?: boolean }[];
  nutritionRows: NutritionLogRow[];
  treatmentCycle: TreatmentCycleRow | null;
  infusionsInPeriod: TreatmentInfusionRow[];
  lastInfusionIso: string | null;
  nextInfusionSummary: string | null;
  /** Histórico para tendências / sparklines (não só o período) */
  biomarkerRowsAll: BiomarkerRow[];
  /** Início do período do relatório (ISO) — filtra métricas com actividade no período */
  reportPeriodFromIso: string;
};

const BRAND = "#5E5CE6";
const PAGE_BG = "#FFFFFF";
const TEXT = "#111111";
const MUTED = "#8E8E93";
const BORDER = "#E5E5EA";
const HEADER_BG = "#5E5CE6";

function reportStyles(): string {
  return `
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 114px 32px 96px 32px;
      color: ${TEXT};
      background: ${PAGE_BG};
      font-size: 10px;
      line-height: 1.35;
    }
    .pdf-header {
      background: linear-gradient(135deg, ${HEADER_BG} 0%, #7B6CF6 100%);
      color: #FFFFFF;
      padding: 16px 20px;
      border-radius: 10px;
      margin-bottom: 112px;
      box-shadow: 0 4px 14px rgba(94, 92, 230, 0.28);
    }
    .pdf-header h1 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .pdf-header .tagline {
      margin: 0;
      font-size: 11px;
      opacity: 0.92;
    }
    .pdf-header .period {
      margin: 8px 0 0 0;
      font-size: 10px;
      opacity: 0.88;
    }
    .section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .section .card {
      background: #F9F9FB;
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid ${BORDER};
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: ${BRAND};
      margin: 0 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 2px solid ${BRAND};
    }
    .section-title.section-symptoms { color: #FF9500; border-bottom-color: #FF9500; }
    .section-title.section-vitals { color: #FF2D55; border-bottom-color: #FF2D55; }
    .section-title.section-meds { color: #32ADE6; border-bottom-color: #32ADE6; }
    .section-title.section-nutrition { color: #34C759; border-bottom-color: #34C759; }
    .section-title.section-treatment { color: #5E5CE6; border-bottom-color: #5E5CE6; }
    .section-title.section-bio { color: #5856D6; border-bottom-color: #5856D6; }
    .subsection {
      font-size: 11px;
      font-weight: 600;
      color: #5E5CE6;
      margin: 10px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid ${BORDER};
    }
    .subsection.section-meds-sub { color: #32ADE6; border-bottom-color: #D1EFFF; }
    .subsection.section-treatment-sub { color: #5E5CE6; border-bottom-color: #E5E5EA; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    table.compact th, table.compact td {
      padding: 4px 6px;
    }
    th {
      background: #F2F2F7;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid ${BORDER};
      font-weight: 600;
      color: #3A3A3C;
    }
    td {
      padding: 6px 8px;
      border: 1px solid ${BORDER};
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #FAFAFA; }
    .info-grid th {
      width: 30%;
      background: #F2F2F7;
    }
    .muted {
      color: ${MUTED};
      font-size: 9px;
      margin: 0;
    }
    .muted.small { font-size: 8px; margin-bottom: 6px; }
    .truncated {
      color: ${MUTED};
      font-size: 9px;
      font-style: italic;
      margin: 6px 0 0 0;
    }
    .chart-wrap {
      margin: 8px 0 10px 0;
      max-width: 100%;
      overflow: hidden;
    }
    .treatment-row {
      display: table;
      width: 100%;
      margin-bottom: 8px;
    }
    .treatment-rings {
      display: table-cell;
      vertical-align: middle;
      width: 120px;
      padding-right: 12px;
    }
    .treatment-info {
      display: table-cell;
      vertical-align: top;
    }
    .bio-grid { width: 100%; }
    .bio-row {
      display: table;
      width: 100%;
      table-layout: fixed;
      border-spacing: 6px 6px;
      margin-bottom: 4px;
    }
    .bio-card {
      display: table-cell;
      width: 50%;
      background: #F9F9FB;
      border: 1px solid ${BORDER};
      border-radius: 8px;
      padding: 8px 10px;
      vertical-align: top;
    }
    .bio-card-empty {
      border: none !important;
      background: transparent !important;
    }
    .bio-card-head {
      font-weight: 700;
      font-size: 9px;
      color: #3A3A3C;
      margin-bottom: 4px;
    }
    .bio-spark { min-height: 36px; margin: 4px 0; }
    .bio-spark-placeholder {
      font-size: 9px;
      color: ${MUTED};
      padding: 8px 0;
    }
    .bio-value {
      font-size: 11px;
      font-weight: 700;
      color: ${TEXT};
    }
    .bio-trend {
      font-size: 9px;
      font-weight: 600;
      color: #34C759;
    }
    .bio-meta {
      font-size: 8px;
      color: ${MUTED};
      margin-top: 4px;
    }
    .pdf-footer {
      text-align: center;
      font-size: 9px;
      color: ${MUTED};
      margin-top: 114px;
      padding-top: 12px;
      border-top: 1px solid ${BORDER};
    }
    .pdf-footer strong { color: ${BRAND}; }
  `;
}

export function buildReportHtml(payload: ReportHtmlPayload): string {
  const { flags, days, generatedAt, patient } = payload;
  const when = generatedAt.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

  const parts: string[] = [];

  parts.push(`<div class="pdf-header">
    <h1>Aura Onco</h1>
    <p class="tagline">Relatório de acompanhamento clínico</p>
    <p class="period">Gerado em ${when} · Período: últimos <strong>${days}</strong> dias</p>
  </div>`);

  if (flags.header && patient) {
    parts.push(sectionPatientIdentification(patient));
  }

  if (flags.symptoms) {
    parts.push(sectionSymptoms(payload.symptomRows));
  }

  if (flags.vitals) {
    parts.push(sectionVitals(payload.vitalRows));
  }

  if (flags.medsTaken) {
    parts.push(sectionMedicationLogs(payload.medLogs, payload.medMeta));
  }

  if (flags.medsActive) {
    parts.push(sectionActiveMedications(payload.medications));
  }

  if (flags.nutrition) {
    parts.push(sectionNutrition(payload.nutritionRows));
  }

  if (flags.treatment) {
    parts.push(
      sectionTreatment(
        payload.treatmentCycle,
        payload.infusionsInPeriod,
        payload.lastInfusionIso,
        payload.nextInfusionSummary
      )
    );
  }

  if (flags.biomarkers) {
    parts.push(sectionBiomarkers(payload.biomarkerRowsAll, payload.reportPeriodFromIso));
  }

  const bodyInner = parts.join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Relatório Aura Onco</title>
  <style>${reportStyles()}</style>
</head>
<body>
${bodyInner}
  <div class="pdf-footer">
    <strong>Confidencial</strong> — Relatório gerado pela app Aura Onco. Destina-se à partilha com a sua equipa de saúde.
  </div>
</body>
</html>`;
}
