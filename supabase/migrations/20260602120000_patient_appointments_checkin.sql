-- Check-in de agendamentos: colunas + RPC para equipa hospitalar (RLS continua a restringir UPDATE direto ao paciente).

ALTER TABLE public.patient_appointments
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS checked_in_source text NULL;

ALTER TABLE public.patient_appointments
  DROP CONSTRAINT IF EXISTS patient_appointments_checked_in_source_check;

ALTER TABLE public.patient_appointments
  ADD CONSTRAINT patient_appointments_checked_in_source_check
  CHECK (checked_in_source IS NULL OR checked_in_source IN ('patient', 'staff'));

COMMENT ON COLUMN public.patient_appointments.checked_in_at IS
  'Momento do check-in (paciente no app ou equipa no dashboard via RPC).';
COMMENT ON COLUMN public.patient_appointments.checked_in_source IS
  'Quem registou o último check-in: patient ou staff.';

CREATE OR REPLACE FUNCTION public.rpc_staff_set_appointment_checkin(
  p_appointment_id uuid,
  p_checked_in boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.patient_appointments pa WHERE pa.id = p_appointment_id
  ) THEN
    RAISE EXCEPTION 'appointment_not_found';
  END IF;

  -- Usa pa.patient_id (coluna) em vez de variável PL/pgSQL — evita erro "relation v_patient_id does not exist"
  -- quando o SQL é executado fora do corpo da função (split por ';' em alguns editores).
  IF NOT EXISTS (
    SELECT 1
    FROM public.patient_appointments pa
    WHERE pa.id = p_appointment_id
      AND public.staff_has_approved_patient_link(pa.patient_id)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_checked_in THEN
    UPDATE public.patient_appointments
    SET
      checked_in_at = now(),
      checked_in_source = 'staff'
    WHERE id = p_appointment_id;
  ELSE
    UPDATE public.patient_appointments
    SET
      checked_in_at = NULL,
      checked_in_source = NULL
    WHERE id = p_appointment_id;
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.rpc_staff_set_appointment_checkin(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_staff_set_appointment_checkin(uuid, boolean) TO authenticated;
