-- Fix 500 / "infinite recursion detected in policy for relation staff_assignments":
-- policies must not subquery the same table they protect without bypassing RLS.

CREATE OR REPLACE FUNCTION public.auth_user_staff_hospital_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT sa.hospital_id
  FROM public.staff_assignments sa
  WHERE sa.staff_id = (select auth.uid());
$$;

REVOKE ALL ON FUNCTION public.auth_user_staff_hospital_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_staff_hospital_ids() TO authenticated;

COMMENT ON FUNCTION public.auth_user_staff_hospital_ids() IS
  'Hospital IDs where the current user has a staff_assignment; used by RLS to avoid recursive scans on staff_assignments.';

DROP POLICY IF EXISTS "staff_assignments_select_same_hospital" ON public.staff_assignments;
CREATE POLICY "staff_assignments_select_same_hospital"
ON public.staff_assignments FOR SELECT TO authenticated
USING (
  hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
);

DROP POLICY IF EXISTS "profiles_select_same_hospital_staff" ON public.profiles;
CREATE POLICY "profiles_select_same_hospital_staff"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments them
    WHERE them.staff_id = profiles.id
      AND them.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
);

DROP POLICY IF EXISTS "profiles_update_hospital_admin_colleague" ON public.profiles;
CREATE POLICY "profiles_update_hospital_admin_colleague"
ON public.profiles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles pr_me
    WHERE pr_me.id = (select auth.uid())
      AND pr_me.role = 'hospital_admin'::public.user_role
  )
  AND profiles.id IS DISTINCT FROM (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments them
    WHERE them.staff_id = profiles.id
      AND them.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles pr_me
    WHERE pr_me.id = (select auth.uid())
      AND pr_me.role = 'hospital_admin'::public.user_role
  )
  AND profiles.id IS DISTINCT FROM (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments them
    WHERE them.staff_id = profiles.id
      AND them.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
);
