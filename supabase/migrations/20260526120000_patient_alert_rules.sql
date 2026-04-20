-- Regras de alerta personalizadas por paciente (dossiê hospitalar).

DO $$ BEGIN
  CREATE TYPE public.patient_alert_rule_kind AS ENUM (
    'symptom_fever',
    'medication_overuse',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.patient_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  name text NOT NULL,
  kind public.patient_alert_rule_kind NOT NULL DEFAULT 'custom',
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'high',
  action_note text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.patient_alert_rules IS 'Alertas configuráveis por paciente no dossiê (febre, superdosagem, etc.).';
COMMENT ON COLUMN public.patient_alert_rules.condition IS 'JSON: febre {"min_celsius":37.8}; superdosagem {"medication_id","max_doses","window_hours"}.';

CREATE INDEX IF NOT EXISTS idx_patient_alert_rules_patient_id ON public.patient_alert_rules (patient_id);

ALTER TABLE public.patient_alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_alert_rules_select_staff" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_select_staff"
ON public.patient_alert_rules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_rules.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "patient_alert_rules_select_patient" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_select_patient"
ON public.patient_alert_rules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_rules.patient_id AND p.profile_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "patient_alert_rules_staff_insert" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_staff_insert"
ON public.patient_alert_rules FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_rules.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "patient_alert_rules_staff_update" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_staff_update"
ON public.patient_alert_rules FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_rules.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_rules.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "patient_alert_rules_staff_delete" ON public.patient_alert_rules;
CREATE POLICY "patient_alert_rules_staff_delete"
ON public.patient_alert_rules FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_rules.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);
