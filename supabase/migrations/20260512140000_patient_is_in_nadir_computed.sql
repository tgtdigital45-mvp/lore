-- is_in_nadir: calculado a partir da última infusão completa (ou last_session_at do ciclo ativo),
-- janela de vigilância dias 7–14 após a referência (datas em UTC, alinhado ao clinicalNadir.ts).

CREATE OR REPLACE FUNCTION public.patient_nadir_reference_at(p_patient_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH last_inf AS (
    SELECT max(session_at) AS t
    FROM public.treatment_infusions
    WHERE patient_id = p_patient_id
      AND status = 'completed'::public.infusion_session_status
  ),
  active_cycle AS (
    SELECT last_session_at
    FROM public.treatment_cycles
    WHERE patient_id = p_patient_id
      AND status = 'active'
    ORDER BY start_date DESC NULLS LAST
    LIMIT 1
  )
  SELECT coalesce(
    (SELECT t FROM last_inf),
    (SELECT last_session_at FROM active_cycle)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_in_nadir_window(ref_ts timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN ref_ts IS NULL THEN false
    ELSE (
      (timezone('UTC', now()))::date >= (timezone('UTC', ref_ts))::date + 7
      AND (timezone('UTC', now()))::date <= (timezone('UTC', ref_ts))::date + 14
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.compute_patient_is_in_nadir(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.is_in_nadir_window(public.patient_nadir_reference_at(p_patient_id));
$$;

CREATE OR REPLACE FUNCTION public.refresh_patient_is_in_nadir(p_patient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.patients
  SET is_in_nadir = public.compute_patient_is_in_nadir(p_patient_id)
  WHERE id = p_patient_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_patients_recompute_is_in_nadir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_in_nadir := public.compute_patient_is_in_nadir(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_recompute_is_in_nadir ON public.patients;
CREATE TRIGGER trg_patients_recompute_is_in_nadir
BEFORE INSERT OR UPDATE ON public.patients
FOR EACH ROW
EXECUTE PROCEDURE public.trg_patients_recompute_is_in_nadir();

CREATE OR REPLACE FUNCTION public.trg_infusions_refresh_patient_nadir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := coalesce(NEW.patient_id, OLD.patient_id);
  IF pid IS NOT NULL THEN
    PERFORM public.refresh_patient_is_in_nadir(pid);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_infusions_refresh_patient_nadir ON public.treatment_infusions;
CREATE TRIGGER trg_infusions_refresh_patient_nadir
AFTER INSERT OR UPDATE OR DELETE ON public.treatment_infusions
FOR EACH ROW
EXECUTE PROCEDURE public.trg_infusions_refresh_patient_nadir();

CREATE OR REPLACE FUNCTION public.trg_cycles_refresh_patient_nadir()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  pid := coalesce(NEW.patient_id, OLD.patient_id);
  IF pid IS NOT NULL THEN
    PERFORM public.refresh_patient_is_in_nadir(pid);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_cycles_refresh_patient_nadir ON public.treatment_cycles;
CREATE TRIGGER trg_cycles_refresh_patient_nadir
AFTER INSERT OR UPDATE OR DELETE ON public.treatment_cycles
FOR EACH ROW
EXECUTE PROCEDURE public.trg_cycles_refresh_patient_nadir();

CREATE OR REPLACE FUNCTION public.refresh_all_patients_nadir_flags()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.patients p
  SET is_in_nadir = public.compute_patient_is_in_nadir(p.id);
$$;

REVOKE ALL ON FUNCTION public.refresh_all_patients_nadir_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_all_patients_nadir_flags() TO service_role;

COMMENT ON COLUMN public.patients.is_in_nadir IS 'Calculado: janela 7–14 dias após última infusão completa (ou last_session_at do ciclo ativo se não houver infusão completa).';

COMMENT ON POLICY "patients_update_own" ON public.patients IS 'Paciente edita dados clínicos da ficha no app; is_in_nadir é recalculado no servidor.';

UPDATE public.patients p
SET is_in_nadir = public.compute_patient_is_in_nadir(p.id);
