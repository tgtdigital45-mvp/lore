-- Fix: audit_logs pode existir sem a coluna metadata (schema antigo / tabela criada antes da coluna).
-- Garante coluna e recria a RPC da Sprint 3.
-- action_type na assinatura como text: evita mismatch se a coluna for text ou enum (cast uniforme).

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

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
