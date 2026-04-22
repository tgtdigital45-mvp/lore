/** Itens de receita devolvidos pelo OCR (alinhado a `backend/src/ocrGemini.ts` PrescriptionItem). */
export type PrescriptionOcrItem = {
  name: string;
  dosage: string;
  form: string;
  posology: string;
  frequency_hours: number;
  duration_days: number | null;
  notes: string;
};
