-- PRD: medicamentos, consentimentos LGPD, sintomas 0-10, consultas, push token, storage voz

-- ---------------------------------------------------------------------------
-- Profiles: token Expo Push (Edge Functions / lembretes servidor)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token text,
  ADD COLUMN IF NOT EXISTS expo_push_token_updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- Consentimentos LGPD (granular)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  consent_required_treatment boolean NOT NULL DEFAULT true,
  consent_analytics boolean NOT NULL DEFAULT false,
  consent_research boolean NOT NULL DEFAULT false,
  consent_share_care_team boolean NOT NULL DEFAULT false,
  consent_notifications boolean NOT NULL DEFAULT true,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  policy_version text NOT NULL DEFAULT '2026-04',
  UNIQUE (profile_id)
);

ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_consents_select_own" ON public.patient_consents;
DROP POLICY IF EXISTS "patient_consents_insert_own" ON public.patient_consents;
DROP POLICY IF EXISTS "patient_consents_update_own" ON public.patient_consents;

CREATE POLICY "patient_consents_select_own"
ON public.patient_consents FOR SELECT TO authenticated
USING (profile_id = (select auth.uid()));

CREATE POLICY "patient_consents_insert_own"
ON public.patient_consents FOR INSERT TO authenticated
WITH CHECK (profile_id = (select auth.uid()));

CREATE POLICY "patient_consents_update_own"
ON public.patient_consents FOR UPDATE TO authenticated
USING (profile_id = (select auth.uid()))
WITH CHECK (profile_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Medicamentos (PRD)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text,
  form text,
  frequency_hours int NOT NULL CHECK (frequency_hours > 0 AND frequency_hours <= 168),
  anchor_at timestamptz NOT NULL,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient_active ON public.medications (patient_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  taken_time timestamptz,
  status text NOT NULL CHECK (status IN ('taken', 'skipped', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_patient_sched ON public.medication_logs (patient_id, scheduled_time DESC);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medications_select_patient" ON public.medications;
DROP POLICY IF EXISTS "medications_insert_patient" ON public.medications;
DROP POLICY IF EXISTS "medications_update_patient" ON public.medications;
DROP POLICY IF EXISTS "medications_delete_patient" ON public.medications;
DROP POLICY IF EXISTS "medication_logs_select_patient" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_insert_patient" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_update_patient" ON public.medication_logs;

CREATE POLICY "medications_select_patient"
ON public.medications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "medications_insert_patient"
ON public.medications FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medications_update_patient"
ON public.medications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medications_delete_patient"
ON public.medications FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medication_logs_select_patient"
ON public.medication_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medication_logs.patient_id
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
    SELECT 1 FROM public.patients p
    WHERE p.id = medication_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medication_logs_update_patient"
ON public.medication_logs FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medication_logs.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medication_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Consultas / lembretes (calendário)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'consult' CHECK (kind IN ('consult', 'exam', 'other')),
  starts_at timestamptz NOT NULL,
  reminder_minutes_before int NOT NULL DEFAULT 1440 CHECK (reminder_minutes_before >= 0 AND reminder_minutes_before <= 10080),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_appointments_patient_starts ON public.patient_appointments (patient_id, starts_at);

ALTER TABLE public.patient_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_appointments_select" ON public.patient_appointments;
DROP POLICY IF EXISTS "patient_appointments_mutate_patient" ON public.patient_appointments;

CREATE POLICY "patient_appointments_select"
ON public.patient_appointments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_appointments.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "patient_appointments_mutate_patient"
ON public.patient_appointments FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_appointments.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_appointments.patient_id AND p.profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Diário PRD: sliders 0–10 + humor + voz (mantém legado com entry_kind)
-- ---------------------------------------------------------------------------
ALTER TABLE public.symptom_logs ADD COLUMN IF NOT EXISTS entry_kind text NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'symptom_logs_entry_kind_chk'
  ) THEN
    ALTER TABLE public.symptom_logs
      ADD CONSTRAINT symptom_logs_entry_kind_chk CHECK (entry_kind IN ('legacy', 'prd'));
  END IF;
END $$;

ALTER TABLE public.symptom_logs ADD COLUMN IF NOT EXISTS pain_level int;
ALTER TABLE public.symptom_logs ADD COLUMN IF NOT EXISTS nausea_level int;
ALTER TABLE public.symptom_logs ADD COLUMN IF NOT EXISTS fatigue_level int;
ALTER TABLE public.symptom_logs ADD COLUMN IF NOT EXISTS mood text;
ALTER TABLE public.symptom_logs ADD COLUMN IF NOT EXISTS voice_storage_path text;

ALTER TABLE public.symptom_logs ALTER COLUMN symptom_category DROP NOT NULL;
ALTER TABLE public.symptom_logs ALTER COLUMN severity DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'symptom_logs_levels_chk'
  ) THEN
    ALTER TABLE public.symptom_logs
      ADD CONSTRAINT symptom_logs_levels_chk CHECK (
        (entry_kind = 'legacy' AND symptom_category IS NOT NULL AND severity IS NOT NULL
          AND pain_level IS NULL AND nausea_level IS NULL AND fatigue_level IS NULL)
        OR
        (entry_kind = 'prd' AND symptom_category IS NULL AND severity IS NULL
          AND pain_level IS NOT NULL AND nausea_level IS NOT NULL AND fatigue_level IS NOT NULL
          AND pain_level >= 0 AND pain_level <= 10
          AND nausea_level >= 0 AND nausea_level <= 10
          AND fatigue_level >= 0 AND fatigue_level <= 10)
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_symptom_requires_action()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  mx int;
BEGIN
  IF NEW.entry_kind = 'prd' THEN
    mx := GREATEST(COALESCE(NEW.pain_level, 0), COALESCE(NEW.nausea_level, 0), COALESCE(NEW.fatigue_level, 0));
    NEW.requires_action := mx >= 8;
  ELSE
    NEW.requires_action := NEW.severity IN ('severe', 'life_threatening');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_symptom_requires_action ON public.symptom_logs;
CREATE TRIGGER trg_symptom_requires_action
BEFORE INSERT OR UPDATE OF severity, pain_level, nausea_level, fatigue_level, entry_kind ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.set_symptom_requires_action();

-- ---------------------------------------------------------------------------
-- Storage: notas de voz (privado)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient_voice', 'patient_voice', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "patient_voice_select" ON storage.objects;
DROP POLICY IF EXISTS "patient_voice_insert" ON storage.objects;
DROP POLICY IF EXISTS "patient_voice_update" ON storage.objects;
DROP POLICY IF EXISTS "patient_voice_delete" ON storage.objects;

CREATE POLICY "patient_voice_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient_voice'
  AND split_part(name, '/', 1)::uuid IN (
    SELECT p.id FROM public.patients p WHERE p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "patient_voice_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient_voice'
  AND split_part(name, '/', 1)::uuid IN (
    SELECT p.id FROM public.patients p WHERE p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "patient_voice_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'patient_voice'
  AND split_part(name, '/', 1)::uuid IN (
    SELECT p.id FROM public.patients p WHERE p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "patient_voice_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient_voice'
  AND split_part(name, '/', 1)::uuid IN (
    SELECT p.id FROM public.patients p WHERE p.profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Desduplicação lembretes servidor (Edge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_reminder_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications (id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medication_id, scheduled_time)
);

ALTER TABLE public.medication_reminder_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medication_reminder_dispatches_service" ON public.medication_reminder_dispatches;

CREATE POLICY "medication_reminder_dispatches_service"
ON public.medication_reminder_dispatches FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.medication_reminder_dispatches IS 'Preenchido por Edge Function (service role); RLS nega client.';
