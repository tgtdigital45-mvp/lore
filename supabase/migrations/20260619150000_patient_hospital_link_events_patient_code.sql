-- Código do paciente em cada evento (staff vê histórico mesmo sem vínculo approved em patients_select).

ALTER TABLE public.patient_hospital_link_events
  ADD COLUMN IF NOT EXISTS patient_code text NULL;

COMMENT ON COLUMN public.patient_hospital_link_events.patient_code IS
  'Cópia do patient_code no momento do evento (para listagens hospitalares sem join em patients).';

CREATE OR REPLACE FUNCTION public.log_patient_hospital_link_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
  v_actor uuid;
  v_code text;
BEGIN
  SELECT p.patient_code INTO v_code FROM public.patients p WHERE p.id = NEW.patient_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.patient_hospital_link_events (
      link_id, patient_id, hospital_id, event_type, prior_status, new_status, actor_profile_id, access_valid_until, patient_code
    ) VALUES (
      NEW.id, NEW.patient_id, NEW.hospital_id, 'created', NULL, NEW.status, NEW.requested_by, NEW.access_valid_until, v_code
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_event := CASE
        WHEN NEW.status = 'pending' AND OLD.status IN ('rejected', 'revoked') THEN 'reopened'
        WHEN NEW.status = 'approved' THEN 'approved'
        WHEN NEW.status = 'rejected' THEN 'rejected'
        WHEN NEW.status = 'revoked' THEN 'revoked'
        ELSE 'status_changed'
      END;
      v_actor := (select auth.uid());
      INSERT INTO public.patient_hospital_link_events (
        link_id, patient_id, hospital_id, event_type, prior_status, new_status, actor_profile_id, access_valid_until, patient_code
      ) VALUES (
        NEW.id, NEW.patient_id, NEW.hospital_id, v_event, OLD.status, NEW.status, v_actor, NEW.access_valid_until, v_code
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.patient_hospital_link_events e
SET patient_code = p.patient_code
FROM public.patients p
WHERE e.patient_id = p.id AND (e.patient_code IS NULL OR e.patient_code IS DISTINCT FROM p.patient_code);
