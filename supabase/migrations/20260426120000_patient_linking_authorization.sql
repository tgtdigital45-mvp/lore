-- Patient public code + hospital–patient links (approval, read vs read_write) + RLS migration off patients.hospital_id

-- ---------------------------------------------------------------------------
-- 1) patients.patient_code (nullable until backfilled)
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS patient_code text;

-- ---------------------------------------------------------------------------
-- 2) patient_hospital_links (before functions that reference it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_hospital_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'read_write')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  requested_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (patient_id, hospital_id)
);

CREATE INDEX IF NOT EXISTS idx_phl_hospital_status ON public.patient_hospital_links (hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_phl_patient ON public.patient_hospital_links (patient_id);

COMMENT ON TABLE public.patient_hospital_links IS 'Hospital access to a patient chart; requires patient approval unless synced from legacy hospital_id.';

-- ---------------------------------------------------------------------------
-- 3) Backfill patient_code (unique AURA-XXXXXX)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  cand text;
  tries int;
BEGIN
  FOR r IN SELECT id FROM public.patients WHERE patient_code IS NULL LOOP
    tries := 0;
    LOOP
      cand := 'AURA-' || upper(substring(md5(random()::text || r.id::text || clock_timestamp()::text || tries::text) from 1 for 6));
      tries := tries + 1;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.patients WHERE patient_code = cand);
      IF tries > 200 THEN
        RAISE EXCEPTION 'backfill patient_code failed for %', r.id;
      END IF;
    END LOOP;
    UPDATE public.patients SET patient_code = cand WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.patients
  ALTER COLUMN patient_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_patient_code_key'
  ) THEN
    ALTER TABLE public.patients ADD CONSTRAINT patients_patient_code_key UNIQUE (patient_code);
  END IF;
END $$;

COMMENT ON COLUMN public.patients.patient_code IS 'Public shareable code (AURA-XXXXXX) for hospital linking.';

CREATE OR REPLACE FUNCTION public.ensure_patient_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  suffix text;
  candidate text;
  i int;
BEGIN
  IF NEW.patient_code IS NOT NULL AND length(trim(NEW.patient_code)) > 0 THEN
    NEW.patient_code := upper(trim(NEW.patient_code));
    RETURN NEW;
  END IF;
  FOR i IN 1..30 LOOP
    suffix := upper(substring(md5(random()::text || clock_timestamp()::text || i::text) from 1 for 6));
    candidate := 'AURA-' || suffix;
    IF NOT EXISTS (SELECT 1 FROM public.patients WHERE patient_code = candidate) THEN
      NEW.patient_code := candidate;
      RETURN NEW;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'ensure_patient_code: could not allocate code';
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_ensure_code ON public.patients;
CREATE TRIGGER trg_patients_ensure_code
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE PROCEDURE public.ensure_patient_code();

-- ---------------------------------------------------------------------------
-- 4) Helpers: staff access via approved patient_hospital_links
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.staff_has_approved_patient_link(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patient_hospital_links phl
    INNER JOIN public.staff_assignments sa
      ON sa.hospital_id = phl.hospital_id AND sa.staff_id = (select auth.uid())
    WHERE phl.patient_id = p_patient_id
      AND phl.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_has_readwrite_patient_link(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patient_hospital_links phl
    INNER JOIN public.staff_assignments sa
      ON sa.hospital_id = phl.hospital_id AND sa.staff_id = (select auth.uid())
    WHERE phl.patient_id = p_patient_id
      AND phl.status = 'approved'
      AND phl.permission_level = 'read_write'
  );
$$;

GRANT EXECUTE ON FUNCTION public.staff_has_approved_patient_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_has_readwrite_patient_link(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Legacy data + sync trigger
-- ---------------------------------------------------------------------------
INSERT INTO public.patient_hospital_links (patient_id, hospital_id, permission_level, status, requested_at, responded_at)
SELECT p.id, p.hospital_id, 'read_write', 'approved', now(), now()
FROM public.patients p
WHERE p.hospital_id IS NOT NULL
ON CONFLICT (patient_id, hospital_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_patient_hospital_link_from_patient_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hospital_id IS NOT NULL THEN
    INSERT INTO public.patient_hospital_links (patient_id, hospital_id, permission_level, status, requested_at, responded_at)
    VALUES (NEW.id, NEW.hospital_id, 'read_write', 'approved', now(), now())
    ON CONFLICT (patient_id, hospital_id) DO UPDATE
      SET status = 'approved',
          permission_level = 'read_write',
          responded_at = COALESCE(public.patient_hospital_links.responded_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_sync_hospital_link ON public.patients;
CREATE TRIGGER trg_patients_sync_hospital_link
AFTER INSERT OR UPDATE OF hospital_id ON public.patients
FOR EACH ROW
EXECUTE PROCEDURE public.sync_patient_hospital_link_from_patient_row();

-- ---------------------------------------------------------------------------
-- 6) RPC: staff search by code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_patient_by_code(p_code text, p_hospital_id uuid)
RETURNS TABLE (patient_id uuid, masked_name text, already_linked boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid()) AND sa.hospital_id = p_hospital_id
  ) THEN
    RAISE EXCEPTION 'search_patient_by_code: not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    CASE
      WHEN length(trim(pr.full_name)) <= 2 THEN '**'
      ELSE substring(trim(pr.full_name) FROM 1 FOR 2) || '***'
    END,
    EXISTS (
      SELECT 1 FROM public.patient_hospital_links phl
      WHERE phl.patient_id = p.id
        AND phl.hospital_id = p_hospital_id
        AND phl.status IN ('pending', 'approved')
    )
  FROM public.patients p
  INNER JOIN public.profiles pr ON pr.id = p.profile_id
  WHERE p.patient_code = upper(trim(p_code));
END;
$$;

REVOKE ALL ON FUNCTION public.search_patient_by_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_patient_by_code(text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) RLS: patient_hospital_links
-- ---------------------------------------------------------------------------
ALTER TABLE public.patient_hospital_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_hospital_links_select" ON public.patient_hospital_links;
DROP POLICY IF EXISTS "patient_hospital_links_insert_staff" ON public.patient_hospital_links;
DROP POLICY IF EXISTS "patient_hospital_links_update_patient" ON public.patient_hospital_links;
DROP POLICY IF EXISTS "patient_hospital_links_update_staff" ON public.patient_hospital_links;

CREATE POLICY "patient_hospital_links_select"
ON public.patient_hospital_links FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_hospital_links.patient_id AND p.profile_id = (select auth.uid())
  )
  OR hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "patient_hospital_links_insert_staff"
ON public.patient_hospital_links FOR INSERT TO authenticated
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
  AND status = 'pending'
  AND requested_by = (select auth.uid())
);

CREATE POLICY "patient_hospital_links_update_patient"
ON public.patient_hospital_links FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_hospital_links.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_hospital_links.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "patient_hospital_links_update_staff"
ON public.patient_hospital_links FOR UPDATE TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
)
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_hospital_links;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 8) DROP policies to replace
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_consolidated" ON public.profiles;
DROP POLICY IF EXISTS "patients_select_consolidated" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_consolidated" ON public.patients;
DROP POLICY IF EXISTS "patients_update_staff" ON public.patients;
DROP POLICY IF EXISTS "patients_delete_staff" ON public.patients;

DROP POLICY IF EXISTS "symptom_logs_insert_consolidated" ON public.symptom_logs;
DROP POLICY IF EXISTS "symptom_logs_select_consolidated" ON public.symptom_logs;

DROP POLICY IF EXISTS "treatment_cycles_select_consolidated" ON public.treatment_cycles;
DROP POLICY IF EXISTS "treatment_cycles_staff_insert" ON public.treatment_cycles;
DROP POLICY IF EXISTS "treatment_cycles_staff_update" ON public.treatment_cycles;
DROP POLICY IF EXISTS "treatment_cycles_staff_delete" ON public.treatment_cycles;
DROP POLICY IF EXISTS "treatment_cycles_insert_patient" ON public.treatment_cycles;
DROP POLICY IF EXISTS "treatment_cycles_update_patient" ON public.treatment_cycles;
DROP POLICY IF EXISTS "treatment_cycles_delete_patient" ON public.treatment_cycles;

DROP POLICY IF EXISTS "medical_documents_select_consolidated" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_insert_consolidated" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_update_patient" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_delete_patient" ON public.medical_documents;

DROP POLICY IF EXISTS "audit_logs_select_consolidated" ON public.audit_logs;

DROP POLICY IF EXISTS "biomarker_logs_select_consolidated" ON public.biomarker_logs;
DROP POLICY IF EXISTS "biomarker_logs_insert_consolidated" ON public.biomarker_logs;
DROP POLICY IF EXISTS "biomarker_logs_delete_patient" ON public.biomarker_logs;

DROP POLICY IF EXISTS "health_wearable_select_consolidated" ON public.health_wearable_samples;

DROP POLICY IF EXISTS "medications_select_patient" ON public.medications;
DROP POLICY IF EXISTS "medications_insert_patient" ON public.medications;
DROP POLICY IF EXISTS "medications_update_patient" ON public.medications;
DROP POLICY IF EXISTS "medications_delete_patient" ON public.medications;

DROP POLICY IF EXISTS "medication_logs_select_patient" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_insert_patient" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_update_patient" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_select" ON public.medication_logs;
DROP POLICY IF EXISTS "medication_logs_delete_patient" ON public.medication_logs;

DROP POLICY IF EXISTS "medication_schedules_select" ON public.medication_schedules;
DROP POLICY IF EXISTS "medication_schedules_insert_patient" ON public.medication_schedules;
DROP POLICY IF EXISTS "medication_schedules_update_patient" ON public.medication_schedules;
DROP POLICY IF EXISTS "medication_schedules_delete_patient" ON public.medication_schedules;

DROP POLICY IF EXISTS "patient_appointments_select" ON public.patient_appointments;
DROP POLICY IF EXISTS "patient_appointments_mutate_patient" ON public.patient_appointments;

DROP POLICY IF EXISTS "treatment_infusions_select_consolidated" ON public.treatment_infusions;
DROP POLICY IF EXISTS "treatment_infusions_staff_insert" ON public.treatment_infusions;
DROP POLICY IF EXISTS "treatment_infusions_staff_update" ON public.treatment_infusions;
DROP POLICY IF EXISTS "treatment_infusions_staff_delete" ON public.treatment_infusions;
DROP POLICY IF EXISTS "treatment_infusions_insert_patient" ON public.treatment_infusions;
DROP POLICY IF EXISTS "treatment_infusions_update_patient" ON public.treatment_infusions;
DROP POLICY IF EXISTS "treatment_infusions_delete_patient" ON public.treatment_infusions;

-- ---------------------------------------------------------------------------
-- 9) Recreate policies
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_consolidated"
ON public.profiles FOR SELECT TO authenticated
USING (
  (select auth.uid()) = id
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.profile_id = profiles.id
      AND public.staff_has_approved_patient_link(p.id)
  )
);

CREATE POLICY "patients_select_consolidated"
ON public.patients FOR SELECT TO authenticated
USING (
  profile_id = (select auth.uid())
  OR public.staff_has_approved_patient_link(id)
);

CREATE POLICY "patients_insert_consolidated"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (profile_id = (select auth.uid()));

CREATE POLICY "patients_update_staff"
ON public.patients FOR UPDATE TO authenticated
USING (public.staff_has_readwrite_patient_link(id))
WITH CHECK (public.staff_has_readwrite_patient_link(id));

CREATE POLICY "patients_delete_staff"
ON public.patients FOR DELETE TO authenticated
USING (public.staff_has_readwrite_patient_link(id));

CREATE POLICY "symptom_logs_insert_consolidated"
ON public.symptom_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "symptom_logs_select_consolidated"
ON public.symptom_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
      )
  )
);

CREATE POLICY "treatment_cycles_select_consolidated"
ON public.treatment_cycles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND public.staff_has_approved_patient_link(p.id)
  )
);

CREATE POLICY "treatment_cycles_staff_insert"
ON public.treatment_cycles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "treatment_cycles_staff_update"
ON public.treatment_cycles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "treatment_cycles_staff_delete"
ON public.treatment_cycles FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "treatment_cycles_insert_patient"
ON public.treatment_cycles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "treatment_cycles_update_patient"
ON public.treatment_cycles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "treatment_cycles_delete_patient"
ON public.treatment_cycles FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medical_documents_select_consolidated"
ON public.medical_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND public.staff_has_approved_patient_link(p.id)
  )
);

CREATE POLICY "medical_documents_insert_consolidated"
ON public.medical_documents FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "medical_documents_update_patient"
ON public.medical_documents FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medical_documents_delete_patient"
ON public.medical_documents FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "audit_logs_select_consolidated"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = audit_logs.target_patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = audit_logs.target_patient_id
      AND public.staff_has_approved_patient_link(p.id)
  )
);

CREATE POLICY "biomarker_logs_select_consolidated"
ON public.biomarker_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
      )
  )
);

CREATE POLICY "biomarker_logs_insert_consolidated"
ON public.biomarker_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "biomarker_logs_delete_patient"
ON public.biomarker_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "health_wearable_select_consolidated"
ON public.health_wearable_samples FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
      )
  )
);

CREATE POLICY "medications_select_patient"
ON public.medications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medications.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
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

-- medication_logs: join medications -> patients (wizard schema may omit patient_id on row)
CREATE POLICY "medication_logs_select_patient"
ON public.medication_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_logs.medication_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
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

CREATE POLICY "medication_schedules_select"
ON public.medication_schedules FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medications m
    JOIN public.patients p ON p.id = m.patient_id
    WHERE m.id = medication_schedules.medication_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
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

CREATE POLICY "patient_appointments_select"
ON public.patient_appointments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_appointments.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
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

CREATE POLICY "treatment_infusions_select_consolidated"
ON public.treatment_infusions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
      )
  )
);

CREATE POLICY "treatment_infusions_staff_insert"
ON public.treatment_infusions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

CREATE POLICY "treatment_infusions_staff_update"
ON public.treatment_infusions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

CREATE POLICY "treatment_infusions_staff_delete"
ON public.treatment_infusions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
);

CREATE POLICY "treatment_infusions_insert_patient"
ON public.treatment_infusions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

CREATE POLICY "treatment_infusions_update_patient"
ON public.treatment_infusions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

CREATE POLICY "treatment_infusions_delete_patient"
ON public.treatment_infusions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 10) RPC staff_audit_logs_list: use approved links (not patients.hospital_id)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.staff_audit_logs_list(integer);

CREATE FUNCTION public.staff_audit_logs_list(p_limit int DEFAULT 120)
RETURNS TABLE (
  id uuid,
  ts timestamptz,
  action_type text,
  metadata jsonb,
  actor_name text,
  patient_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.ts,
    a.action_type::text,
    a.metadata,
    COALESCE(af.full_name, ''::text) AS actor_name,
    COALESCE(pf.full_name, ''::text) AS patient_name
  FROM public.audit_logs a
  LEFT JOIN public.profiles af ON af.id = a.actor_id
  LEFT JOIN public.patients pt ON pt.id = a.target_patient_id
  LEFT JOIN public.profiles pf ON pf.id = pt.profile_id
  WHERE a.target_patient_id IS NOT NULL
    AND pt.id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.patient_hospital_links phl
      WHERE phl.patient_id = pt.id
        AND phl.status = 'approved'
        AND phl.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid()
        )
    )
  ORDER BY a.ts DESC
  LIMIT LEAST(500, GREATEST(1, COALESCE(p_limit, 120)));
$$;

REVOKE ALL ON FUNCTION public.staff_audit_logs_list(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_audit_logs_list(int) TO authenticated;
