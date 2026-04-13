-- Cuidador: leitura do paciente vinculado e dados clínicos necessários ao diário.

CREATE OR REPLACE FUNCTION public.caregiver_has_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patient_caregivers pc
    WHERE pc.patient_id = p_patient_id AND pc.caregiver_profile_id = (select auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.caregiver_has_patient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caregiver_has_patient(uuid) TO authenticated;

DROP POLICY IF EXISTS "profiles_select_consolidated" ON public.profiles;
CREATE POLICY "profiles_select_consolidated"
ON public.profiles FOR SELECT TO authenticated
USING (
  (select auth.uid()) = id
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.profile_id = profiles.id
      AND public.staff_has_approved_patient_link(p.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.profile_id = profiles.id
      AND public.caregiver_has_patient(p.id)
  )
);

DROP POLICY IF EXISTS "patients_select_consolidated" ON public.patients;
CREATE POLICY "patients_select_consolidated"
ON public.patients FOR SELECT TO authenticated
USING (
  profile_id = (select auth.uid())
  OR public.staff_has_approved_patient_link(id)
  OR public.caregiver_has_patient(id)
);

DROP POLICY IF EXISTS "symptom_logs_select_consolidated" ON public.symptom_logs;
CREATE POLICY "symptom_logs_select_consolidated"
ON public.symptom_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
        OR public.caregiver_has_patient(p.id)
      )
  )
);

DROP POLICY IF EXISTS "treatment_cycles_select_consolidated" ON public.treatment_cycles;
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
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id
      AND public.caregiver_has_patient(p.id)
  )
);

DROP POLICY IF EXISTS "treatment_infusions_select_consolidated" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_select_consolidated"
ON public.treatment_infusions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
        OR public.caregiver_has_patient(p.id)
      )
  )
);
