-- Intervalo de referência por marcador (ex.: coluna "Valores de Referência" em hemogramas).

ALTER TABLE public.biomarker_logs
  ADD COLUMN IF NOT EXISTS reference_range text;

COMMENT ON COLUMN public.biomarker_logs.reference_range IS
  'Intervalo de referência extraído do documento (laboratório), ex. hemograma.';
