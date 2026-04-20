-- Reabrir pedido após rejected/revoked (mesma linha UNIQUE patient+hospital),
-- período opcional de validade do acesso, histórico de eventos para hospital e paciente.

-- ---------------------------------------------------------------------------
-- 1) Coluna opcional: até quando o acesso aprovado deve ser considerado (informativo / futura política)
-- ---------------------------------------------------------------------------
ALTER TABLE public.patient_hospital_links
  ADD COLUMN IF NOT EXISTS access_valid_until timestamptz NULL;

COMMENT ON COLUMN public.patient_hospital_links.access_valid_until IS
  'Opcional: data limite do acesso acordada no pedido (staff/paciente). Pode ser NULL (sem prazo definido).';

-- ---------------------------------------------------------------------------
-- 2) Histórico de eventos do vínculo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_hospital_link_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.patient_hospital_links (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  prior_status text NULL,
  new_status text NOT NULL,
  actor_profile_id uuid NULL REFERENCES public.profiles (id) ON DELETE SET NULL,
  access_valid_until timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_hospital_link_events_type_chk CHECK (
    event_type IN (
      'created',
      'reopened',
      'approved',
      'rejected',
      'revoked',
      'status_changed'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_phle_patient_created ON public.patient_hospital_link_events (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phle_hospital_created ON public.patient_hospital_link_events (hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phle_link ON public.patient_hospital_link_events (link_id, created_at DESC);

COMMENT ON TABLE public.patient_hospital_link_events IS
  'Auditoria de pedidos de vínculo hospital–paciente (criação, reabertura, decisão do paciente).';

ALTER TABLE public.patient_hospital_link_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_hospital_link_events_select_patient" ON public.patient_hospital_link_events;
CREATE POLICY "patient_hospital_link_events_select_patient"
ON public.patient_hospital_link_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_hospital_link_events.patient_id AND p.profile_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "patient_hospital_link_events_select_staff" ON public.patient_hospital_link_events;
CREATE POLICY "patient_hospital_link_events_select_staff"
ON public.patient_hospital_link_events FOR SELECT TO authenticated
USING (
  hospital_id IN (
    SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 3) Trigger: registar eventos (SECURITY DEFINER para inserir com RLS activo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_patient_hospital_link_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
  v_actor uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.patient_hospital_link_events (
      link_id, patient_id, hospital_id, event_type, prior_status, new_status, actor_profile_id, access_valid_until
    ) VALUES (
      NEW.id, NEW.patient_id, NEW.hospital_id, 'created', NULL, NEW.status, NEW.requested_by, NEW.access_valid_until
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
        link_id, patient_id, hospital_id, event_type, prior_status, new_status, actor_profile_id, access_valid_until
      ) VALUES (
        NEW.id, NEW.patient_id, NEW.hospital_id, v_event, OLD.status, NEW.status, v_actor, NEW.access_valid_until
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_hospital_links_log_event ON public.patient_hospital_links;
CREATE TRIGGER trg_patient_hospital_links_log_event
AFTER INSERT OR UPDATE OF status ON public.patient_hospital_links
FOR EACH ROW
EXECUTE FUNCTION public.log_patient_hospital_link_event();

-- ---------------------------------------------------------------------------
-- 4) RPC staff: criar pedido novo OU reabrir após rejected/revoked
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.staff_request_patient_hospital_link(
  p_patient_id uuid,
  p_hospital_id uuid,
  p_permission_level text DEFAULT 'read',
  p_access_valid_until timestamptz DEFAULT NULL
)
RETURNS TABLE (link_id uuid, outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Em RETURN QUERY / UPDATE, um identificador só na lista SELECT ou no WHERE pode ser lido como
  -- nome de relação (ex.: SELECT x ≡ SELECT * FROM x). Usar (var)::tipo ou chaves naturais no WHERE.
  lnk_row_id uuid;
  lnk_status text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.staff_id = (select auth.uid()) AND sa.hospital_id = p_hospital_id
  ) THEN
    RAISE EXCEPTION 'staff_request_patient_hospital_link: not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_permission_level IS NOT NULL AND p_permission_level NOT IN ('read', 'read_write') THEN
    RAISE EXCEPTION 'staff_request_patient_hospital_link: invalid permission_level' USING ERRCODE = '22023';
  END IF;

  SELECT phl.id, phl.status INTO lnk_row_id, lnk_status
  FROM public.patient_hospital_links phl
  WHERE phl.patient_id = p_patient_id AND phl.hospital_id = p_hospital_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.patient_hospital_links (
      patient_id, hospital_id, permission_level, status, requested_by, access_valid_until
    ) VALUES (
      p_patient_id,
      p_hospital_id,
      COALESCE(NULLIF(trim(p_permission_level), ''), 'read'),
      'pending',
      (select auth.uid()),
      p_access_valid_until
    )
    RETURNING id INTO lnk_row_id;
    RETURN QUERY SELECT (lnk_row_id)::uuid AS link_id, 'inserted'::text AS outcome;
    RETURN;
  END IF;

  IF lnk_status = 'pending' THEN
    RAISE EXCEPTION 'staff_request_patient_hospital_link: already_pending' USING ERRCODE = 'P0001';
  END IF;

  IF lnk_status = 'approved' THEN
    RAISE EXCEPTION 'staff_request_patient_hospital_link: already_approved' USING ERRCODE = 'P0001';
  END IF;

  IF lnk_status IN ('rejected', 'revoked') THEN
    UPDATE public.patient_hospital_links phl
    SET
      status = 'pending',
      requested_at = now(),
      requested_by = (select auth.uid()),
      responded_at = NULL,
      permission_level = COALESCE(NULLIF(trim(p_permission_level), ''), phl.permission_level),
      access_valid_until = p_access_valid_until
    WHERE phl.patient_id = p_patient_id AND phl.hospital_id = p_hospital_id;
    RETURN QUERY SELECT (lnk_row_id)::uuid AS link_id, 'reopened'::text AS outcome;
    RETURN;
  END IF;

  RAISE EXCEPTION 'staff_request_patient_hospital_link: unexpected_status %', lnk_status USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.staff_request_patient_hospital_link(uuid, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_request_patient_hospital_link(uuid, uuid, text, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.staff_request_patient_hospital_link(uuid, uuid, text, timestamptz) IS
  'Staff com lotação: cria pedido pending ou reabre após rejected/revoked (nova notificação ao paciente).';

-- Realtime na mesma migração que cria a tabela (evita 42P01 se ficheiros forem aplicados fora de ordem).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_hospital_link_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
