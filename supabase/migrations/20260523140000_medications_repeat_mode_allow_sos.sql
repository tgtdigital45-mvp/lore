-- SOS (as_needed): garantir que o CHECK em medications.repeat_mode aceita 'as_needed'.
-- Em alguns projetos, repeat_mode foi criada sem esta variante (ou ADD COLUMN IF NOT EXISTS não aplicou o CHECK),
-- e o insert com repeat_mode = 'as_needed' falha com medications_repeat_mode_check.

DO $$
DECLARE
  con_name text;
BEGIN
  FOR con_name IN
    SELECT c.conname::text
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'medications'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%repeat_mode%'
  LOOP
    EXECUTE format('ALTER TABLE public.medications DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE public.medications
  ADD CONSTRAINT medications_repeat_mode_check
  CHECK (repeat_mode IN ('daily', 'weekdays', 'interval_hours', 'as_needed'));

COMMENT ON COLUMN public.medications.repeat_mode IS
  'daily: medication_schedules todos os dias; weekdays: schedule_weekdays; interval_hours: frequency_hours + anchor_at; as_needed: SOS (sem horário fixo).';
