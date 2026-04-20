-- Colunas em falta no remoto (ex.: kind) quando a tabela existe sem o schema completo de 20260526120000.
-- Idempotente: pode correr depois de 20260529130000 ou sozinha.

DO $$ BEGIN
  CREATE TYPE public.patient_alert_rule_kind AS ENUM (
    'symptom_fever',
    'medication_overuse',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.patient_alert_rules ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.patient_alert_rules ADD COLUMN IF NOT EXISTS kind public.patient_alert_rule_kind;
ALTER TABLE public.patient_alert_rules ADD COLUMN IF NOT EXISTS condition jsonb;
ALTER TABLE public.patient_alert_rules ADD COLUMN IF NOT EXISTS severity text;
ALTER TABLE public.patient_alert_rules ADD COLUMN IF NOT EXISTS action_note text;
ALTER TABLE public.patient_alert_rules ADD COLUMN IF NOT EXISTS enabled boolean;
ALTER TABLE public.patient_alert_rules ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.patient_alert_rules SET name = 'Alerta' WHERE name IS NULL OR btrim(name) = '';
UPDATE public.patient_alert_rules SET kind = 'custom'::public.patient_alert_rule_kind WHERE kind IS NULL;
UPDATE public.patient_alert_rules SET condition = '{}'::jsonb WHERE condition IS NULL;
UPDATE public.patient_alert_rules SET severity = 'high' WHERE severity IS NULL OR btrim(severity) = '';
UPDATE public.patient_alert_rules SET enabled = true WHERE enabled IS NULL;
UPDATE public.patient_alert_rules SET created_at = now() WHERE created_at IS NULL;

ALTER TABLE public.patient_alert_rules ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.patient_alert_rules ALTER COLUMN kind SET NOT NULL;
ALTER TABLE public.patient_alert_rules ALTER COLUMN condition SET NOT NULL;
ALTER TABLE public.patient_alert_rules ALTER COLUMN severity SET NOT NULL;
ALTER TABLE public.patient_alert_rules ALTER COLUMN enabled SET NOT NULL;
ALTER TABLE public.patient_alert_rules ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.patient_alert_rules ALTER COLUMN kind SET DEFAULT 'custom'::public.patient_alert_rule_kind;
ALTER TABLE public.patient_alert_rules ALTER COLUMN condition SET DEFAULT '{}'::jsonb;
ALTER TABLE public.patient_alert_rules ALTER COLUMN severity SET DEFAULT 'high';
ALTER TABLE public.patient_alert_rules ALTER COLUMN enabled SET DEFAULT true;
ALTER TABLE public.patient_alert_rules ALTER COLUMN created_at SET DEFAULT now();

COMMENT ON COLUMN public.patient_alert_rules.condition IS 'JSON: febre {"min_celsius":37.8}; superdosagem {"medication_id","max_doses","window_hours"}.';

NOTIFY pgrst, 'reload schema';
