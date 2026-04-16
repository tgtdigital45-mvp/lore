-- Ordenação e arquivo na lista de medicamentos (aba Medicamentos)

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.medications.archived IS 'Oculto na aba Medicamentos; recuperável ao desarquivar.';
COMMENT ON COLUMN public.medications.sort_order IS 'Ordem manual na lista (menor = primeiro).';

CREATE INDEX IF NOT EXISTS idx_medications_patient_sort ON public.medications (patient_id, archived, sort_order);
