-- Denormaliza hospital_id em symptom_logs (Realtime filter + métricas por coorte).
-- Tabelas de desduplicação: lembretes de consultas e webhooks requires_action.

ALTER TABLE public.symptom_logs
  ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals (id) ON DELETE SET NULL;

UPDATE public.symptom_logs sl
SET hospital_id = p.hospital_id
FROM public.patients p
WHERE p.id = sl.patient_id AND sl.hospital_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_symptom_logs_hospital_logged
  ON public.symptom_logs (hospital_id, logged_at DESC)
  WHERE hospital_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_symptom_log_hospital_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  hid uuid;
BEGIN
  SELECT p.hospital_id INTO hid FROM public.patients p WHERE p.id = NEW.patient_id;
  NEW.hospital_id := hid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_symptom_log_hospital_id ON public.symptom_logs;
CREATE TRIGGER trg_symptom_log_hospital_id
BEFORE INSERT OR UPDATE OF patient_id ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.set_symptom_log_hospital_id();

-- ---------------------------------------------------------------------------
-- Desduplicação: lembretes de consultas (Edge appointment-reminders)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointment_reminder_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.patient_appointments (id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('day_before', 'same_day')),
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, reminder_kind)
);

ALTER TABLE public.appointment_reminder_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_reminder_dispatches_service"
ON public.appointment_reminder_dispatches FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.appointment_reminder_dispatches IS 'Preenchido por Edge Function (service role); RLS nega client.';

-- ---------------------------------------------------------------------------
-- Desduplicação: webhook requires_action (Edge requires-action-webhook)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requires_action_webhook_dispatches (
  symptom_log_id uuid PRIMARY KEY REFERENCES public.symptom_logs (id) ON DELETE CASCADE,
  dispatched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.requires_action_webhook_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requires_action_webhook_dispatches_service"
ON public.requires_action_webhook_dispatches FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.requires_action_webhook_dispatches IS 'Preenchido por Edge Function (service role); RLS nega client.';

-- ---------------------------------------------------------------------------
-- RPC: métricas agregadas (dashboard hospital) — só staff com lotação no hospital
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.staff_symptom_cohort_metrics(
  p_hospital_id uuid,
  p_days int DEFAULT 14
)
RETURNS TABLE (
  bucket date,
  symptom_count bigint,
  requires_action_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_days < 1 OR p_days > 366 THEN
    RAISE EXCEPTION 'invalid_p_days';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
      AND sa.hospital_id = p_hospital_id
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (date_trunc('day', sl.logged_at AT TIME ZONE 'UTC'))::date AS bucket,
    count(*)::bigint AS symptom_count,
    count(*) FILTER (WHERE sl.requires_action = true)::bigint AS requires_action_count
  FROM public.symptom_logs sl
  WHERE sl.hospital_id = p_hospital_id
    AND sl.logged_at >= (now() AT TIME ZONE 'UTC') - (p_days::text || ' days')::interval
  GROUP BY 1
  ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_symptom_cohort_metrics(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_symptom_cohort_metrics(uuid, int) TO authenticated;
