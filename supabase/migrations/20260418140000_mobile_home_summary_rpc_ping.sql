-- Ponto de extensão para leitura consolidada do Resumo mobile (1 RTT no futuro).
-- O app continua a usar `fetchHomeSummarySnapshot` até esta função ser expandida com o payload JSON completo.
CREATE OR REPLACE FUNCTION public.rpc_mobile_home_summary_ping(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.patients p WHERE p.id = p_patient_id);
$$;

REVOKE ALL ON FUNCTION public.rpc_mobile_home_summary_ping(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_mobile_home_summary_ping(uuid) TO authenticated;

COMMENT ON FUNCTION public.rpc_mobile_home_summary_ping(uuid) IS
  'QA sprint: placeholder para RPC consolidada do resumo; hoje o cliente usa várias queries em paralelo.';
