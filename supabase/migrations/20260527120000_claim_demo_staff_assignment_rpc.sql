-- Atomic demo onboarding: avoids RLS timing races when the client updates profiles then inserts staff_assignments.
-- Call from CRM after signup with pending staff flag; idempotent (ON CONFLICT DO NOTHING).

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

  -- Promote signup users still marked patient so the row satisfies staff policies and FK targets.
  UPDATE public.profiles
  SET role = 'hospital_admin'::public.user_role
  WHERE id = auth.uid()
    AND role = 'patient'::public.user_role;

  INSERT INTO public.staff_assignments (staff_id, hospital_id)
  VALUES (auth.uid(), demo)
  ON CONFLICT (staff_id, hospital_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_demo_staff_assignment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_demo_staff_assignment() TO authenticated;

COMMENT ON FUNCTION public.claim_demo_staff_assignment IS
  'CRM demo: vínculo idempotente ao hospital demo (staff_assignments); evita 500 por corrida RLS no browser.';
