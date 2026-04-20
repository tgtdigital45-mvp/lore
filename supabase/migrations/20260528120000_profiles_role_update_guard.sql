-- Impede que usuários autenticados alterem a própria coluna `role` diretamente (escalada client-side).
-- Promoções de papel continuam permitidas via claim_demo_staff_assignment (SECURITY DEFINER + flag de sessão).

CREATE OR REPLACE FUNCTION public.claim_demo_staff_assignment()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = demo) THEN
    RAISE EXCEPTION 'demo_hospital_missing';
  END IF;

  PERFORM set_config('app.allow_profile_role_change', 'true', true);

  UPDATE public.profiles
  SET role = 'hospital_admin'::public.user_role
  WHERE id = auth.uid()
    AND role = 'patient'::public.user_role;

  PERFORM set_config('app.allow_profile_role_change', '', true);

  INSERT INTO public.staff_assignments (staff_id, hospital_id)
  VALUES (auth.uid(), demo)
  ON CONFLICT (staff_id, hospital_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_block_unauthorized_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('app.allow_profile_role_change', true) = 'true' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'forbidden_profile_role_change'
      USING ERRCODE = '42501',
            HINT = 'Role changes must go through authorized server flows.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_change ON public.profiles;
CREATE TRIGGER profiles_guard_role_change
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (NEW.role IS DISTINCT FROM OLD.role)
EXECUTE PROCEDURE public.profiles_block_unauthorized_role_change();

COMMENT ON FUNCTION public.profiles_block_unauthorized_role_change IS
  'Blocks direct profile.role updates except when claim_demo_staff_assignment sets app.allow_profile_role_change.';
