export type OcrMetricExtracted = {
  name: string;
  value: string;
  unit: string;
  is_abnormal: boolean;
  reference_alert: string;
  reference_range?: string;
};

export type ProfessionalRegistryExtracted = {
  kind: string;
  number: string;
  uf?: string;
};

export type PrescriptionItem = {
  name: string;
  dosage: string;
  form: string;
  posology: string;
  frequency_hours: number;
  duration_days: number | null;
  notes: string;
};

/** Corpo `extracted` devolvido por POST /api/ocr/analyze (igual ao `ai_extracted_json` gravado). */
export type OcrExtractedPayload = {
  summary_pt_br: string;
  exam_date_iso?: string;
  confidence_note: string;
  title_pt_br: string;
  doctor_name: string;
  /** CRM, CRO, COREN… — omitido em respostas antigas do backend. */
  professional_registries?: ProfessionalRegistryExtracted[];
  markers: Record<string, unknown>;
  metrics: OcrMetricExtracted[];
  /** Itens de receita (OCR) — registo opcional na aba Medicamentos. */
  prescription_items?: PrescriptionItem[];
  /** Triagem no backend: exame clínico, administrativo/convênio, ou recusado antes de gravar. */
  document_suitability?: "clinical_exam" | "administrative_insurance" | "not_medical";
  /** Filtro de lista na app (chips). */
  ui_category?: "exames" | "laudos" | "receitas" | "atestados" | "nutricao";
};
