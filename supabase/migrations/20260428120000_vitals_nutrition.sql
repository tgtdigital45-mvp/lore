-- Manual vital signs and nutrition logs (patient-owned; staff read via approved links)

-- ---------------------------------------------------------------------------
-- vital_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vital_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  logged_at timestamptz NOT NULL DEFAULT now(),
  vital_type text NOT NULL CHECK (
    vital_type IN ('temperature', 'heart_rate', 'blood_pressure', 'spo2', 'weight', 'glucose')
  ),
  value_numeric numeric(10, 2),
  value_systolic int,
  value_diastolic int,
  unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vital_logs_patient_logged ON public.vital_logs (patient_id, logged_at DESC);

ALTER TABLE public.vital_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vital_logs_select_consolidated"
ON public.vital_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_logs.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
      )
  )
);

CREATE POLICY "vital_logs_insert_consolidated"
ON public.vital_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_logs.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_logs.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "vital_logs_update_patient"
ON public.vital_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_logs.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "vital_logs_delete_patient"
ON public.vital_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

COMMENT ON TABLE public.vital_logs IS 'Patient-entered vital sign measurements.';

-- ---------------------------------------------------------------------------
-- nutrition_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  logged_at timestamptz NOT NULL DEFAULT now(),
  log_type text NOT NULL CHECK (log_type IN ('water', 'coffee', 'meal', 'calories', 'appetite')),
  quantity int,
  meal_name text,
  calories int,
  protein_g int,
  carbs_g int,
  fat_g int,
  appetite_level int CHECK (appetite_level IS NULL OR (appetite_level >= 0 AND appetite_level <= 10)),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_patient_logged ON public.nutrition_logs (patient_id, logged_at DESC);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_logs_select_consolidated"
ON public.nutrition_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = nutrition_logs.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
      )
  )
);

CREATE POLICY "nutrition_logs_insert_consolidated"
ON public.nutrition_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = nutrition_logs.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = nutrition_logs.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "nutrition_logs_update_patient"
ON public.nutrition_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = nutrition_logs.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = nutrition_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "nutrition_logs_delete_patient"
ON public.nutrition_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = nutrition_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

COMMENT ON TABLE public.nutrition_logs IS 'Patient-entered nutrition and appetite logs.';
