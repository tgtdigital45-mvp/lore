-- Medication wizard: visual fields, pinning, repeat modes, per-day time slots

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS shape text,
  ADD COLUMN IF NOT EXISTS color_left text,
  ADD COLUMN IF NOT EXISTS color_right text,
  ADD COLUMN IF NOT EXISTS color_bg text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS repeat_mode text NOT NULL DEFAULT 'interval_hours'
    CHECK (repeat_mode IN ('daily', 'weekdays', 'interval_hours', 'as_needed')),
  ADD COLUMN IF NOT EXISTS schedule_weekdays smallint[] NULL;

COMMENT ON COLUMN public.medications.repeat_mode IS 'daily: use medication_schedules every day; weekdays: use schedule_weekdays; interval_hours: use frequency_hours + anchor_at';

CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications (id) ON DELETE CASCADE,
  time_of_day time NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_schedules_med ON public.medication_schedules (medication_id);

ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medication_schedules_select" ON public.medication_schedules;
DROP POLICY IF EXISTS "medication_schedules_insert_patient" ON public.medication_schedules;
DROP POLICY IF EXISTS "medication_schedules_update_patient" ON public.medication_schedules;
DROP POLICY IF EXISTS "medication_schedules_delete_patient" ON public.medication_schedules;

CREATE POLICY "medication_schedules_select"
ON public.medication_schedules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_schedules.medication_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "medication_schedules_insert_patient"
ON public.medication_schedules FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_schedules.medication_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medication_schedules_update_patient"
ON public.medication_schedules FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_schedules.medication_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_schedules.medication_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medication_schedules_delete_patient"
ON public.medication_schedules FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_schedules.medication_id AND p.profile_id = (select auth.uid())
  )
);

-- Medication logs: track when doses were taken
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications (id) ON DELETE CASCADE,
  taken_at timestamptz NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_med ON public.medication_logs (medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_taken ON public.medication_logs (taken_at);

ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medication_logs_select" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_insert_patient" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_update_patient" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_delete_patient" ON public.medication_logs;

CREATE POLICY "medication_logs_select"
ON public.medication_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_logs.medication_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "medication_logs_insert_patient"
ON public.medication_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_logs.medication_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medication_logs_update_patient"
ON public.medication_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_logs.medication_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_logs.medication_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medication_logs_delete_patient"
ON public.medication_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_logs.medication_id AND p.profile_id = (select auth.uid())
  )
);
