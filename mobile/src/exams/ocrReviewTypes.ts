export type OcrMetricExtracted = {
  name: string;
  value: string;
  unit: string;
  is_abnormal: boolean;
  reference_alert: string;
  reference_range?: string;
};

/** Corpo `extracted` devolvido por POST /api/ocr/analyze (igual ao `ai_extracted_json` gravado). */
export type OcrExtractedPayload = {
  summary_pt_br: string;
  exam_date_iso?: string;
  confidence_note: string;
  title_pt_br: string;
  doctor_name: string;
  markers: Record<string, unknown>;
  metrics: OcrMetricExtracted[];
  /** Triagem no backend: exame clínico, administrativo/convênio, ou recusado antes de gravar. */
  document_suitability?: "clinical_exam" | "administrative_insurance" | "not_medical";
  /** Filtro de lista na app (chips). */
  ui_category?: "exames" | "laudos" | "receitas" | "atestados" | "nutricao";
};
