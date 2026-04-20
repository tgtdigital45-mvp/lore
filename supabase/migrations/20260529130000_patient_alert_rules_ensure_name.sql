-- Alguns ambientes criaram `patient_alert_rules` sem a coluna `name` (schema antigo ou IF NOT EXISTS).
-- PostgREST falha com 400: "column patient_alert_rules.name does not exist".

ALTER TABLE public.patient_alert_rules
  ADD COLUMN IF NOT EXISTS name text;

UPDATE public.patient_alert_rules
SET name = 'Alerta'
WHERE name IS NULL OR btrim(name) = '';

ALTER TABLE public.patient_alert_rules
  ALTER COLUMN name SET NOT NULL;

COMMENT ON COLUMN public.patient_alert_rules.name IS 'Rótulo exibido no dossiê (ex.: febre, superdosagem).';
