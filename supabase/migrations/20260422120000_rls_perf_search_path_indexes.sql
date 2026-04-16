-- Performance: auth.uid() -> (select auth.uid()) nas policies; policies duplicadas consolidadas;
-- índices em FKs; search_path fixo em funções trigger.

-- ---------------------------------------------------------------------------
-- Functions: search_path imutável (Supabase linter)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_symptom_requires_action'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.set_symptom_requires_action() SET search_path = public';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'touch_health_wearable_samples_updated_at'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.touch_health_wearable_samples_updated_at() SET search_path = public';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'check_symptom_severity'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.check_symptom_severity() SET search_path = public';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Índices em foreign keys (performance)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_id ON public.medical_documents (patient_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_actor_id ON public.outbound_messages (actor_id);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_hospital_id ON public.outbound_messages (hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_hospital_id ON public.staff_assignments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_cycle_id ON public.symptom_logs (cycle_id);
CREATE INDEX IF NOT EXISTS idx_treatment_cycles_patient_id ON public.treatment_cycles (patient_id);

-- ---------------------------------------------------------------------------
-- Remover policies antigas (inclui nomes PT que possam existir só na BD remota)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "hospitals_select_authenticated" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_update_hospital_admin_assigned" ON public.hospitals;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Medical staff can view hospital patients profiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;

DROP POLICY IF EXISTS "Patients read own chart" ON public.patients;
DROP POLICY IF EXISTS "Patients insert own chart row" ON public.patients;
DROP POLICY IF EXISTS "Hospital staff read write patients in hospital" ON public.patients;
DROP POLICY IF EXISTS "Pacientes podem ver o próprio prontuário" ON public.patients;

DROP POLICY IF EXISTS "Patients can insert own symptoms" ON public.symptom_logs;
DROP POLICY IF EXISTS "Patients can view own symptoms" ON public.symptom_logs;
DROP POLICY IF EXISTS "Hospital staff can view patient symptoms" ON public.symptom_logs;
DROP POLICY IF EXISTS "Pacientes podem inserir seus próprios sintomas" ON public.symptom_logs;
DROP POLICY IF EXISTS "Pacientes podem ver seus próprios sintomas" ON public.symptom_logs;

DROP POLICY IF EXISTS "Patients read own cycles" ON public.treatment_cycles;
DROP POLICY IF EXISTS "Hospital staff manage cycles" ON public.treatment_cycles;

DROP POLICY IF EXISTS "Patients manage own documents metadata" ON public.medical_documents;
DROP POLICY IF EXISTS "Hospital staff read documents" ON public.medical_documents;
DROP POLICY IF EXISTS "Hospital staff insert medical documents" ON public.medical_documents;

DROP POLICY IF EXISTS "Staff sees own assignments" ON public.staff_assignments;
DROP POLICY IF EXISTS "Staff insert own assignment demo hospital" ON public.staff_assignments;

DROP POLICY IF EXISTS "Staff read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Patients read own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;

DROP POLICY IF EXISTS "Patients read own biomarker logs" ON public.biomarker_logs;
DROP POLICY IF EXISTS "Patients insert own biomarker logs" ON public.biomarker_logs;
DROP POLICY IF EXISTS "Patients delete own biomarker logs" ON public.biomarker_logs;
DROP POLICY IF EXISTS "Hospital staff read biomarker logs" ON public.biomarker_logs;
DROP POLICY IF EXISTS "Hospital staff insert biomarker logs" ON public.biomarker_logs;

DROP POLICY IF EXISTS "Hospital staff read outbound messages" ON public.outbound_messages;

DROP POLICY IF EXISTS "Patients read own wearable samples" ON public.health_wearable_samples;
DROP POLICY IF EXISTS "Patients insert own wearable samples" ON public.health_wearable_samples;
DROP POLICY IF EXISTS "Patients update own wearable samples" ON public.health_wearable_samples;
DROP POLICY IF EXISTS "Hospital staff read wearable samples for hospital patients" ON public.health_wearable_samples;

DROP POLICY IF EXISTS "Restrict Scan Downloads" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own scans" ON storage.objects;
DROP POLICY IF EXISTS "Users update own scans" ON storage.objects;

-- Políticas já criadas por aplicação anterior desta migração (re-push / BD alinhada)
DROP POLICY IF EXISTS "hospitals_select_authenticated" ON public.hospitals;
DROP POLICY IF EXISTS "hospitals_update_hospital_admin_assigned" ON public.hospitals;
DROP POLICY IF EXISTS "profiles_select_consolidated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "staff_assignments_select_own" ON public.staff_assignments;
DROP POLICY IF EXISTS "staff_assignments_insert_demo" ON public.staff_assignments;
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
DROP POLICY IF EXISTS "medical_documents_select_consolidated" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_insert_consolidated" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_update_patient" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_delete_patient" ON public.medical_documents;
DROP POLICY IF EXISTS "audit_logs_select_consolidated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;
DROP POLICY IF EXISTS "biomarker_logs_select_consolidated" ON public.biomarker_logs;
DROP POLICY IF EXISTS "biomarker_logs_insert_consolidated" ON public.biomarker_logs;
DROP POLICY IF EXISTS "biomarker_logs_delete_patient" ON public.biomarker_logs;
DROP POLICY IF EXISTS "outbound_messages_staff_select" ON public.outbound_messages;
DROP POLICY IF EXISTS "health_wearable_select_consolidated" ON public.health_wearable_samples;
DROP POLICY IF EXISTS "health_wearable_insert_patient" ON public.health_wearable_samples;
DROP POLICY IF EXISTS "health_wearable_update_patient" ON public.health_wearable_samples;
DROP POLICY IF EXISTS "storage_medical_scans_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_medical_scans_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_medical_scans_update" ON storage.objects;

-- ---------------------------------------------------------------------------
-- Policies consolidadas (initplan: (select auth.uid()))
-- ---------------------------------------------------------------------------
CREATE POLICY "hospitals_select_authenticated"
ON public.hospitals FOR SELECT TO authenticated
USING (true);

CREATE POLICY "hospitals_update_hospital_admin_assigned"
ON public.hospitals FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    JOIN public.profiles pr ON pr.id = sa.staff_id
    WHERE sa.staff_id = (select auth.uid())
      AND sa.hospital_id = hospitals.id
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    JOIN public.profiles pr ON pr.id = sa.staff_id
    WHERE sa.staff_id = (select auth.uid())
      AND sa.hospital_id = hospitals.id
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

CREATE POLICY "profiles_select_consolidated"
ON public.profiles FOR SELECT TO authenticated
USING (
  (select auth.uid()) = id
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.profile_id = profiles.id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "staff_assignments_select_own"
ON public.staff_assignments FOR SELECT TO authenticated
USING (staff_id = (select auth.uid()));

CREATE POLICY "staff_assignments_insert_demo"
ON public.staff_assignments FOR INSERT TO authenticated
WITH CHECK (
  staff_id = (select auth.uid())
  AND hospital_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = (select auth.uid())
      AND pr.role IN ('doctor'::public.user_role, 'nurse'::public.user_role, 'hospital_admin'::public.user_role)
  )
);

CREATE POLICY "patients_select_consolidated"
ON public.patients FOR SELECT TO authenticated
USING (
  profile_id = (select auth.uid())
  OR hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "patients_insert_consolidated"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (
  profile_id = (select auth.uid())
  OR hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "patients_update_staff"
ON public.patients FOR UPDATE TO authenticated
USING (
  hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
  )
)
WITH CHECK (
  hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "patients_delete_staff"
ON public.patients FOR DELETE TO authenticated
USING (
  hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "symptom_logs_insert_consolidated"
ON public.symptom_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id
      AND p.profile_id = (select auth.uid())
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
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa
          WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "treatment_cycles_select_consolidated"
ON public.treatment_cycles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "treatment_cycles_staff_insert"
ON public.treatment_cycles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "treatment_cycles_staff_update"
ON public.treatment_cycles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "treatment_cycles_staff_delete"
ON public.treatment_cycles FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "medical_documents_select_consolidated"
ON public.medical_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "medical_documents_insert_consolidated"
ON public.medical_documents FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "medical_documents_update_patient"
ON public.medical_documents FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "medical_documents_delete_patient"
ON public.medical_documents FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "audit_logs_select_consolidated"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = audit_logs.target_patient_id
      AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = audit_logs.target_patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "audit_logs_insert_system"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (actor_id = (select auth.uid()));

CREATE POLICY "biomarker_logs_select_consolidated"
ON public.biomarker_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa
          WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "biomarker_logs_insert_consolidated"
ON public.biomarker_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

CREATE POLICY "biomarker_logs_delete_patient"
ON public.biomarker_logs FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "outbound_messages_staff_select"
ON public.outbound_messages FOR SELECT TO authenticated
USING (
  hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
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
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa
          WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "health_wearable_insert_patient"
ON public.health_wearable_samples FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id
      AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "health_wearable_update_patient"
ON public.health_wearable_samples FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id
      AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id
      AND p.profile_id = (select auth.uid())
  )
);

CREATE POLICY "storage_medical_scans_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medical_scans' AND owner = (select auth.uid()));

CREATE POLICY "storage_medical_scans_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medical_scans' AND owner = (select auth.uid()));

CREATE POLICY "storage_medical_scans_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medical_scans' AND owner = (select auth.uid()));
