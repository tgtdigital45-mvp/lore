-- Restringe DELETE em patients a utilizadores com role hospital_admin e vínculo read_write ao paciente.

DROP POLICY IF EXISTS "patients_delete_staff" ON public.patients;

CREATE POLICY "patients_delete_hospital_admin"
ON public.patients FOR DELETE TO authenticated
USING (
  public.staff_has_readwrite_patient_link(id)
  AND EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

COMMENT ON POLICY "patients_delete_hospital_admin" ON public.patients IS
  'Apenas gestão hospitalar (hospital_admin) com link read_write pode apagar prontuário.';
