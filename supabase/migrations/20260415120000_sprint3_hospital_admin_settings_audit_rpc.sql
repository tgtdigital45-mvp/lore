-- Sprint 3: gestor atualiza alert_rules; RPC de auditoria para o dashboard.

-- Tabelas antigas podem não ter metadata (CREATE TABLE IF NOT EXISTS não altera colunas).
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "hospitals_update_hospital_admin_assigned" ON public.hospitals;

CREATE POLICY "hospitals_update_hospital_admin_assigned"
ON public.hospitals FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles pr ON pr.id = sa.staff_id
    WHERE sa.staff_id = auth.uid()
      AND sa.hospital_id = hospitals.id
      AND pr.role = 'hospital_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff_assignments sa
    JOIN public.profiles pr ON pr.id = sa.staff_id
    WHERE sa.staff_id = auth.uid()
      AND sa.hospital_id = hospitals.id
      AND pr.role = 'hospital_admin'
  )
);

DROP FUNCTION IF EXISTS public.staff_audit_logs_list(integer);

CREATE FUNCTION public.staff_audit_logs_list(p_limit int DEFAULT 120)
RETURNS TABLE (
  id uuid,
  ts timestamptz,
  action_type text,
  metadata jsonb,
  actor_name text,
  patient_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.ts,
    a.action_type::text,
    a.metadata,
    COALESCE(af.full_name, ''::text) AS actor_name,
    COALESCE(pf.full_name, ''::text) AS patient_name
  FROM public.audit_logs a
  LEFT JOIN public.profiles af ON af.id = a.actor_id
  LEFT JOIN public.patients pt ON pt.id = a.target_patient_id
  LEFT JOIN public.profiles pf ON pf.id = pt.profile_id
  WHERE a.target_patient_id IS NOT NULL
    AND pt.id IS NOT NULL
    AND pt.hospital_id IS NOT NULL
    AND pt.hospital_id IN (
      SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid()
    )
  ORDER BY a.ts DESC
  LIMIT LEAST(500, GREATEST(1, COALESCE(p_limit, 120)));
$$;

REVOKE ALL ON FUNCTION public.staff_audit_logs_list(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_audit_logs_list(int) TO authenticated;
