-- Equipe clínica: leitura de colegas no mesmo hospital, gestão de lotações por hospital_admin,
-- e lookup de utilizador por email (apenas gestores).

-- 1) Ver todas as lotações do mesmo hospital (complementa "só a própria linha")
DROP POLICY IF EXISTS "staff_assignments_select_same_hospital" ON public.staff_assignments;
CREATE POLICY "staff_assignments_select_same_hospital"
ON public.staff_assignments FOR SELECT TO authenticated
USING (
  hospital_id IN (
    SELECT sa.hospital_id
    FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid())
  )
);

-- 2) hospital_admin: adicionar lotação no seu hospital
DROP POLICY IF EXISTS "staff_assignments_insert_hospital_admin" ON public.staff_assignments;
CREATE POLICY "staff_assignments_insert_hospital_admin"
ON public.staff_assignments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    INNER JOIN public.profiles pr ON pr.id = sa.staff_id
    WHERE sa.staff_id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
      AND sa.hospital_id = staff_assignments.hospital_id
  )
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = staff_assignments.staff_id)
);

-- 3) hospital_admin: remover lotação (não pode remover a própria linha — evita lock-out acidental)
DROP POLICY IF EXISTS "staff_assignments_delete_hospital_admin" ON public.staff_assignments;
CREATE POLICY "staff_assignments_delete_hospital_admin"
ON public.staff_assignments FOR DELETE TO authenticated
USING (
  staff_assignments.staff_id IS DISTINCT FROM (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    INNER JOIN public.profiles pr ON pr.id = sa.staff_id
    WHERE sa.staff_id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
      AND sa.hospital_id = staff_assignments.hospital_id
  )
);

-- 4) Ler perfis de colegas com lotação no mesmo hospital
DROP POLICY IF EXISTS "profiles_select_same_hospital_staff" ON public.profiles;
CREATE POLICY "profiles_select_same_hospital_staff"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments me
    INNER JOIN public.staff_assignments them
      ON them.hospital_id = me.hospital_id AND them.staff_id = profiles.id
    WHERE me.staff_id = (select auth.uid())
  )
);

-- 5) hospital_admin: atualizar dados não sensíveis de colegas (role continua protegido pelo trigger em profiles)
DROP POLICY IF EXISTS "profiles_update_hospital_admin_colleague" ON public.profiles;
CREATE POLICY "profiles_update_hospital_admin_colleague"
ON public.profiles FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles pr_me WHERE pr_me.id = (select auth.uid()) AND pr_me.role = 'hospital_admin'::public.user_role)
  AND profiles.id IS DISTINCT FROM (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments me
    INNER JOIN public.staff_assignments them
      ON them.hospital_id = me.hospital_id AND them.staff_id = profiles.id
    WHERE me.staff_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles pr_me WHERE pr_me.id = (select auth.uid()) AND pr_me.role = 'hospital_admin'::public.user_role)
  AND profiles.id IS DISTINCT FROM (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.staff_assignments me
    INNER JOIN public.staff_assignments them
      ON them.hospital_id = me.hospital_id AND them.staff_id = profiles.id
    WHERE me.staff_id = (select auth.uid())
  )
);

-- 6) RPC: resolver email → user id (apenas hospital_admin autenticado)
CREATE OR REPLACE FUNCTION public.hospital_admin_lookup_staff_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    INNER JOIN public.profiles pr ON pr.id = sa.staff_id
    WHERE sa.staff_id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT u.id INTO v_id
  FROM auth.users u
  WHERE lower(trim(u.email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.hospital_admin_lookup_staff_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hospital_admin_lookup_staff_by_email(text) TO authenticated;

COMMENT ON FUNCTION public.hospital_admin_lookup_staff_by_email(text) IS
  'Gestor hospitalar: devolve auth user id pelo email para vincular staff_assignments (Equipe Clínica).';
