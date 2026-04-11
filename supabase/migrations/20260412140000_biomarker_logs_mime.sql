-- BiomarkerLog: séries temporais para gráficos no Resumo; ligado a exames OCR.
-- mime_type no documento: presigned URLs R2 com Content-Type correto.

ALTER TABLE public.medical_documents
  ADD COLUMN IF NOT EXISTS mime_type text;

CREATE TABLE IF NOT EXISTS public.biomarker_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  medical_document_id uuid REFERENCES public.medical_documents (id) ON DELETE CASCADE,
  name text NOT NULL,
  value_numeric double precision,
  value_text text,
  unit text,
  is_abnormal boolean NOT NULL DEFAULT false,
  reference_alert text,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biomarker_logs_patient_name_logged
  ON public.biomarker_logs (patient_id, name, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_biomarker_logs_document
  ON public.biomarker_logs (medical_document_id);

ALTER TABLE public.biomarker_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients read own biomarker logs"
ON public.biomarker_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = biomarker_logs.patient_id AND p.profile_id = auth.uid())
);

CREATE POLICY "Patients insert own biomarker logs"
ON public.biomarker_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = biomarker_logs.patient_id AND p.profile_id = auth.uid())
);

CREATE POLICY "Patients delete own biomarker logs"
ON public.biomarker_logs FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = biomarker_logs.patient_id AND p.profile_id = auth.uid())
);
