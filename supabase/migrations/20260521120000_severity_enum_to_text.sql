-- Convert severity from enum to text (fixes PostgREST enum cache issues after ALTER TYPE ... ADD VALUE).
-- Triggers that reference column lists including `severity` must be dropped before ALTER COLUMN TYPE.

DROP TRIGGER IF EXISTS trg_symptom_logs_set_triage ON public.symptom_logs;
DROP TRIGGER IF EXISTS trg_symptom_requires_action ON public.symptom_logs;

ALTER TABLE public.symptom_logs
  ALTER COLUMN severity TYPE text USING severity::text;

ALTER TABLE public.symptom_logs
  ADD CONSTRAINT symptom_logs_severity_values_chk
  CHECK (
    severity IS NULL
    OR severity IN (
      'absent',
      'present',
      'mild',
      'moderate',
      'severe',
      'life_threatening'
    )
  );

DROP TYPE IF EXISTS public.symptom_severity;

-- Restore triggers (same definitions as 20260515120000_ctcae_prom_monitoring_readiness_risk.sql)
CREATE TRIGGER trg_symptom_logs_set_triage
BEFORE INSERT OR UPDATE OF entry_kind, severity, pain_level, nausea_level, fatigue_level, body_temperature, symptom_category, ae_max_grade
ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.trg_symptom_logs_set_triage();

CREATE TRIGGER trg_symptom_requires_action
BEFORE INSERT OR UPDATE OF severity, pain_level, nausea_level, fatigue_level, entry_kind, ae_max_grade ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.set_symptom_requires_action();

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
