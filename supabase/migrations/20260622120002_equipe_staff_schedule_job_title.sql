-- Equipe clínica: cargo declarado, plantão e horários por lotação (staff_assignments);
-- gestor pode atualizar lotação; chaves staff_id/hospital_id imutáveis por trigger.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text;

COMMENT ON COLUMN public.profiles.job_title IS 'Cargo / função declarada no hospital (ex.: Chefe de serviço), além do papel sistema (role).';

ALTER TABLE public.staff_assignments
  ADD COLUMN IF NOT EXISTS clinical_shift text,
  ADD COLUMN IF NOT EXISTS work_schedule jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.staff_assignments.clinical_shift IS 'Nome ou tipo de plantão (ex.: Ambulatório, Urgências).';
COMMENT ON COLUMN public.staff_assignments.work_schedule IS
  'Horários por dia da semana: chaves "1"–"7" (Seg–Dom), valor {"start":"HH:MM","end":"HH:MM"}.';

CREATE OR REPLACE FUNCTION public.staff_assignments_prevent_key_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_id IS DISTINCT FROM OLD.staff_id OR NEW.hospital_id IS DISTINCT FROM OLD.hospital_id THEN
    RAISE EXCEPTION 'staff_assignment_keys_immutable'
      USING ERRCODE = '42501',
            MESSAGE = 'Não é permitido alterar hospital ou profissional da lotação.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_assignments_prevent_key_change ON public.staff_assignments;
CREATE TRIGGER trg_staff_assignments_prevent_key_change
BEFORE UPDATE ON public.staff_assignments
FOR EACH ROW
EXECUTE PROCEDURE public.staff_assignments_prevent_key_change();

DROP POLICY IF EXISTS "staff_assignments_update_hospital_admin" ON public.staff_assignments;
CREATE POLICY "staff_assignments_update_hospital_admin"
ON public.staff_assignments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
  AND hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
  AND hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
);

-- Storage: gestor hospitalar pode escrever avatares na pasta do profissional (primeiro segmento = profile id com lotação no mesmo hospital).
DROP POLICY IF EXISTS "storage_avatars_insert_hospital_admin_colleague" ON storage.objects;
CREATE POLICY "storage_avatars_insert_hospital_admin_colleague"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE '%/%'
  AND EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
  AND split_part(name, '/', 1) IN (
    SELECT sa.staff_id::text
    FROM public.staff_assignments sa
    WHERE sa.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
);

DROP POLICY IF EXISTS "storage_avatars_update_hospital_admin_colleague" ON storage.objects;
CREATE POLICY "storage_avatars_update_hospital_admin_colleague"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE '%/%'
  AND EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
  AND split_part(name, '/', 1) IN (
    SELECT sa.staff_id::text
    FROM public.staff_assignments sa
    WHERE sa.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
)
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "storage_avatars_delete_hospital_admin_colleague" ON storage.objects;
CREATE POLICY "storage_avatars_delete_hospital_admin_colleague"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE '%/%'
  AND EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
  AND split_part(name, '/', 1) IN (
    SELECT sa.staff_id::text
    FROM public.staff_assignments sa
    WHERE sa.hospital_id IN (SELECT public.auth_user_staff_hospital_ids())
  )
);
