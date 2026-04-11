-- Data em que o exame foi realizado (extraída do documento); fallback na app = uploaded_at.
ALTER TABLE public.medical_documents
  ADD COLUMN IF NOT EXISTS exam_performed_at timestamptz;

COMMENT ON COLUMN public.medical_documents.exam_performed_at IS 'Data/hora do exame no documento; se NULL, usar uploaded_at.';

UPDATE public.medical_documents
SET exam_performed_at = uploaded_at
WHERE exam_performed_at IS NULL;
