-- Onco MVP: schema, RLS, audit, storage (refs: docs/arquitetura-bd.md, docs/politicas-compliance.md)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'doctor', 'nurse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cancer_type AS ENUM ('breast', 'lung', 'prostate', 'leukemia', 'colorectal', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE symptom_severity AS ENUM ('mild', 'moderate', 'severe', 'life_threatening');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cycle_status AS ENUM ('active', 'completed', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('blood_test', 'biopsy', 'scan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action_type AS ENUM ('VIEW_SYMPTOMS', 'VIEW_PROFILE', 'VIEW_PATIENT', 'EMERGENCY_TRIGGER', 'AGENT_SYMPTOM_LOG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'patient',
  full_name text NOT NULL DEFAULT '',
  date_of_birth date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, hospital_id)
);

CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  primary_cancer_type cancer_type NOT NULL DEFAULT 'other',
  current_stage text,
  hospital_id uuid REFERENCES public.hospitals (id),
  is_in_nadir boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id)
);

CREATE TABLE IF NOT EXISTS public.treatment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  protocol_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status cycle_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.symptom_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.treatment_cycles (id) ON DELETE SET NULL,
  symptom_category text NOT NULL,
  severity symptom_severity NOT NULL,
  body_temperature numeric(4,1),
  logged_at timestamptz NOT NULL DEFAULT now(),
  requires_action boolean NOT NULL DEFAULT false,
  notes text
);

CREATE TABLE IF NOT EXISTS public.medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  document_type document_type NOT NULL,
  ai_extracted_json jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  target_patient_id uuid REFERENCES public.patients (id) ON DELETE CASCADE,
  action_type audit_action_type NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- CREATE TABLE IF NOT EXISTS não altera tabela já existente: índice abaixo exige coluna ts
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ts timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_patients_profile ON public.patients (profile_id);
CREATE INDEX IF NOT EXISTS idx_patients_hospital ON public.patients (hospital_id);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_patient_logged ON public.symptom_logs (patient_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff ON public.staff_assignments (staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs (target_patient_id, ts DESC);

-- Business rules
CREATE OR REPLACE FUNCTION public.set_symptom_requires_action()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.requires_action := NEW.severity IN ('severe', 'life_threatening');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_symptom_requires_action ON public.symptom_logs;
CREATE TRIGGER trg_symptom_requires_action
BEFORE INSERT OR UPDATE OF severity ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.set_symptom_requires_action();

-- Auth: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();

-- RPC: optional explicit audit from app/backend
CREATE OR REPLACE FUNCTION public.record_audit(
  p_target_patient_id uuid,
  p_action audit_action_type,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, target_patient_id, action_type, metadata)
  VALUES (auth.uid(), p_target_patient_id, p_action, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_audit(uuid, audit_action_type, jsonb) TO authenticated;

-- RLS
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- hospitals: readable by authenticated (minimal); staff may need list
CREATE POLICY "hospitals_select_authenticated"
ON public.hospitals FOR SELECT
TO authenticated
USING (true);

-- profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Medical staff can view hospital patients profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.profile_id = profiles.id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid()
      )
  )
);

-- patients
CREATE POLICY "Patients read own chart"
ON public.patients FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

CREATE POLICY "Patients insert own chart row"
ON public.patients FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Hospital staff read write patients in hospital"
ON public.patients FOR ALL
TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
)
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

-- symptom_logs
CREATE POLICY "Patients can insert own symptoms"
ON public.symptom_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Patients can view own symptoms"
ON public.symptom_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Hospital staff can view patient symptoms"
ON public.symptom_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
);

-- treatment_cycles
CREATE POLICY "Patients read own cycles"
ON public.treatment_cycles FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = treatment_cycles.patient_id AND p.profile_id = auth.uid())
);

CREATE POLICY "Hospital staff manage cycles"
ON public.treatment_cycles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
);

-- medical_documents
CREATE POLICY "Patients manage own documents metadata"
ON public.medical_documents FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = medical_documents.patient_id AND p.profile_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = medical_documents.patient_id AND p.profile_id = auth.uid())
);

CREATE POLICY "Hospital staff read documents"
ON public.medical_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
);

-- staff_assignments: staff sees own rows
CREATE POLICY "Staff sees own assignments"
ON public.staff_assignments FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- audit_logs: staff sees audits for their hospital patients; patients see own-related entries
CREATE POLICY "Staff read audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = audit_logs.target_patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
);

CREATE POLICY "Patients read own audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = audit_logs.target_patient_id AND p.profile_id = auth.uid())
);

CREATE POLICY "System insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical_scans', 'medical_scans', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Restrict Scan Downloads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical_scans' AND owner = auth.uid()
);

CREATE POLICY "Users upload own scans"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical_scans' AND owner = auth.uid());

CREATE POLICY "Users update own scans"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'medical_scans' AND owner = auth.uid());

-- Seed demo hospital (optional dev)
INSERT INTO public.hospitals (id, name)
SELECT '00000000-0000-0000-0000-000000000001', 'Hospital Demo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.hospitals WHERE id = '00000000-0000-0000-0000-000000000001'
);
