-- Evita recursão / erros ao avaliar UPDATE em profiles: o check "sou hospital_admin?"
-- não deve reentrar em RLS de profiles dentro da mesma política.

CREATE OR REPLACE FUNCTION public.auth_user_is_hospital_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (select auth.uid())
      AND p.role = 'hospital_admin'::public.user_role
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_is_hospital_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_is_hospital_admin() TO authenticated;

COMMENT ON FUNCTION public.auth_user_is_hospital_admin() IS
  'True se o utilizador autenticado é hospital_admin (leitura com RLS desligada; usado em políticas RLS).';

DROP POLICY IF EXISTS "profiles_update_hospital_admin_colleague" ON public.profiles;
CREATE POLICY "profiles_update_hospital_admin_colleague"
ON public.profiles FOR UPDATE TO authenticated
USING (
  (SELECT public.auth_user_is_hospital_admin())
  AND profiles.id IS DISTINCT FROM (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments them
    WHERE them.staff_id = profiles.id
      AND them.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
)
WITH CHECK (
  (SELECT public.auth_user_is_hospital_admin())
  AND profiles.id IS DISTINCT FROM (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments them
    WHERE them.staff_id = profiles.id
      AND them.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
);
