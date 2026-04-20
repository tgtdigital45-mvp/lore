-- search_patient_by_code: devolver link_status explícito (none|pending|approved|…) em vez de already_linked boolean,
-- para o dashboard distinguir «já pedido e a aguardar» de «já aprovado».
--
-- Postgres não permite CREATE OR REPLACE quando muda o tipo de retorno (OUT); é preciso DROP primeiro.

DROP FUNCTION IF EXISTS public.search_patient_by_code(text, uuid);

CREATE FUNCTION public.search_patient_by_code(p_code text, p_hospital_id uuid)
RETURNS TABLE (patient_id uuid, masked_name text, link_status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid()) AND sa.hospital_id = p_hospital_id
  ) THEN
    RAISE EXCEPTION 'search_patient_by_code: not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    CASE
      WHEN length(trim(pr.full_name)) <= 2 THEN '**'
      ELSE substring(trim(pr.full_name) FROM 1 FOR 2) || '***'
    END,
    COALESCE(phl.status::text, 'none')
  FROM public.patients p
  INNER JOIN public.profiles pr ON pr.id = p.profile_id
  LEFT JOIN public.patient_hospital_links phl
    ON phl.patient_id = p.id
    AND phl.hospital_id = p_hospital_id
  WHERE p.patient_code = upper(trim(p_code));
END;
$$;

REVOKE ALL ON FUNCTION public.search_patient_by_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_patient_by_code(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.search_patient_by_code(text, uuid) IS
  'Staff: resolve código AURA → patient_id, nome mascarado e estado do vínculo com o hospital (none se não existe linha em patient_hospital_links).';
