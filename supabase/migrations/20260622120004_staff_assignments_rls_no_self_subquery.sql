-- Evita "infinite recursion detected in policy for relation staff_assignments":
-- INSERT/DELETE ainda usavam EXISTS (SELECT … FROM staff_assignments sa …) na própria tabela.
-- UPDATE lia profiles; em alguns planos isso reentra em staff_assignments. Alinhar aos helpers SD.

DROP POLICY IF EXISTS "staff_assignments_insert_hospital_admin" ON public.staff_assignments;
CREATE POLICY "staff_assignments_insert_hospital_admin"
ON public.staff_assignments FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.auth_user_is_hospital_admin())
  AND hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = staff_assignments.staff_id)
);

DROP POLICY IF EXISTS "staff_assignments_delete_hospital_admin" ON public.staff_assignments;
CREATE POLICY "staff_assignments_delete_hospital_admin"
ON public.staff_assignments FOR DELETE TO authenticated
USING (
  staff_assignments.staff_id IS DISTINCT FROM (select auth.uid())
  AND (SELECT public.auth_user_is_hospital_admin())
  AND hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
);

DROP POLICY IF EXISTS "staff_assignments_update_hospital_admin" ON public.staff_assignments;
CREATE POLICY "staff_assignments_update_hospital_admin"
ON public.staff_assignments FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_is_hospital_admin())
  AND hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
)
WITH CHECK (
  (SELECT public.auth_user_is_hospital_admin())
  AND hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
);
