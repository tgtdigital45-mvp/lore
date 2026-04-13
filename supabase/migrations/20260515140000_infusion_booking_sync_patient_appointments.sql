-- Reservas da unidade de infusão (com paciente) espelham-se em patient_appointments para o app do paciente (calendário / resumo).

ALTER TABLE public.patient_appointments DROP CONSTRAINT IF EXISTS patient_appointments_kind_check;
ALTER TABLE public.patient_appointments ADD CONSTRAINT patient_appointments_kind_check
  CHECK (kind IN ('consult', 'exam', 'other', 'infusion'));

ALTER TABLE public.patient_appointments
  ADD COLUMN IF NOT EXISTS infusion_booking_id uuid REFERENCES public.infusion_resource_bookings (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS patient_appointments_infusion_booking_id_key
  ON public.patient_appointments (infusion_booking_id)
  WHERE infusion_booking_id IS NOT NULL;

COMMENT ON COLUMN public.patient_appointments.infusion_booking_id IS 'Preenchido quando o agendamento veio da agenda de infusão da equipa; removido em cascata com a reserva.';

CREATE OR REPLACE FUNCTION public.sync_patient_appointment_from_infusion_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res_label text;
  appt_title text;
  note_text text;
BEGIN
  DELETE FROM public.patient_appointments WHERE infusion_booking_id = NEW.id;

  IF NEW.patient_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT trim(r.label) INTO res_label FROM public.infusion_resources r WHERE r.id = NEW.resource_id;
  appt_title := 'Infusão';
  IF res_label IS NOT NULL AND res_label <> '' THEN
    appt_title := appt_title || ' · ' || res_label;
  END IF;

  note_text := COALESCE(NULLIF(trim(NEW.medication_notes), ''), '');
  IF NEW.ends_at IS NOT NULL THEN
    IF note_text <> '' THEN
      note_text := note_text || E'\n';
    END IF;
    note_text := note_text || 'Fim previsto: ' || to_char(NEW.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' (horário local)';
  END IF;

  INSERT INTO public.patient_appointments (
    patient_id,
    title,
    kind,
    starts_at,
    reminder_minutes_before,
    notes,
    infusion_booking_id
  ) VALUES (
    NEW.patient_id,
    appt_title,
    'infusion',
    NEW.starts_at,
    1440,
    NULLIF(note_text, ''),
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Reservas já existentes (com paciente), antes do trigger automático
INSERT INTO public.patient_appointments (
  patient_id,
  title,
  kind,
  starts_at,
  reminder_minutes_before,
  notes,
  infusion_booking_id
)
SELECT
  b.patient_id,
  'Infusão' || CASE WHEN trim(COALESCE(r.label, '')) <> '' THEN ' · ' || trim(r.label) ELSE '' END,
  'infusion',
  b.starts_at,
  1440,
  NULLIF(
    trim(
      concat_ws(
        E'\n',
        NULLIF(trim(b.medication_notes), ''),
        CASE
          WHEN b.ends_at IS NOT NULL THEN
            'Fim previsto: ' || to_char(b.ends_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' (horário local)'
        END
      )
    ),
    ''
  ),
  b.id
FROM public.infusion_resource_bookings b
JOIN public.infusion_resources r ON r.id = b.resource_id
WHERE b.patient_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.patient_appointments pa WHERE pa.infusion_booking_id = b.id);

DROP TRIGGER IF EXISTS trg_infusion_booking_sync_patient_appointments ON public.infusion_resource_bookings;
CREATE TRIGGER trg_infusion_booking_sync_patient_appointments
AFTER INSERT OR UPDATE OF patient_id, starts_at, ends_at, medication_notes, resource_id
ON public.infusion_resource_bookings
FOR EACH ROW
EXECUTE PROCEDURE public.sync_patient_appointment_from_infusion_booking();
