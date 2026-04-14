-- Janelas temporais por protocolo, regras de alerta dinâmicas, catálogo de medicamentos de referência
-- e vínculo protocolo↔medicamento↔diretriz. Opcional: eventos de alerta por paciente (auditoria).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.protocol_time_anchor AS ENUM (
    'from_cycle_start',
    'from_last_infusion'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_metric_kind AS ENUM (
    'body_temperature',
    'lab_platelets',
    'symptom_severity',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- medication_reference (catálogo; não confundir com public.medications do paciente)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medication_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  synonyms text[] NOT NULL DEFAULT '{}',
  normalized_name text GENERATED ALWAYS AS (lower(trim(canonical_name))) STORED,
  rxnorm_cui text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medication_reference_canonical_nonempty CHECK (length(trim(canonical_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_medication_reference_normalized
  ON public.medication_reference (normalized_name);

COMMENT ON TABLE public.medication_reference IS 'Dicionário para configurar vigilância por fármaco (match com medications.name do paciente).';

-- ---------------------------------------------------------------------------
-- protocol_guideline_windows (N:N guideline + janela no ciclo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.protocol_guideline_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.protocols (id) ON DELETE CASCADE,
  guideline_id uuid NOT NULL REFERENCES public.monitoring_guidelines (id) ON DELETE CASCADE,
  time_anchor public.protocol_time_anchor NOT NULL,
  day_offset_min int NOT NULL DEFAULT 0 CHECK (day_offset_min >= 0),
  day_offset_max int CHECK (day_offset_max IS NULL OR day_offset_max >= day_offset_min),
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_guideline_windows_protocol
  ON public.protocol_guideline_windows (protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_guideline_windows_anchor
  ON public.protocol_guideline_windows (protocol_id, time_anchor);

COMMENT ON COLUMN public.protocol_guideline_windows.day_offset_max IS 'NULL = sem limite superior (dia >= day_offset_min).';

-- ---------------------------------------------------------------------------
-- protocol_alert_rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.protocol_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.protocols (id) ON DELETE CASCADE,
  name text NOT NULL,
  time_anchor public.protocol_time_anchor NOT NULL,
  day_offset_min int NOT NULL DEFAULT 0 CHECK (day_offset_min >= 0),
  day_offset_max int CHECK (day_offset_max IS NULL OR day_offset_max >= day_offset_min),
  metric_kind public.alert_metric_kind NOT NULL DEFAULT 'custom',
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity_level public.severity_level NOT NULL,
  action_required text NOT NULL DEFAULT '',
  message_template text,
  link_guideline_id uuid REFERENCES public.monitoring_guidelines (id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_alert_rules_protocol ON public.protocol_alert_rules (protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_alert_rules_protocol_enabled ON public.protocol_alert_rules (protocol_id, enabled);

-- ---------------------------------------------------------------------------
-- protocol_medication_watch
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.protocol_medication_watch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.protocols (id) ON DELETE CASCADE,
  medication_reference_id uuid NOT NULL REFERENCES public.medication_reference (id) ON DELETE CASCADE,
  guideline_id uuid NOT NULL REFERENCES public.monitoring_guidelines (id) ON DELETE CASCADE,
  priority int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (protocol_id, medication_reference_id, guideline_id)
);

CREATE INDEX IF NOT EXISTS idx_protocol_medication_watch_protocol ON public.protocol_medication_watch (protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_medication_watch_ref ON public.protocol_medication_watch (medication_reference_id);

-- ---------------------------------------------------------------------------
-- patient_alert_events (auditoria / histórico opcional)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.protocol_alert_rules (id) ON DELETE SET NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity_level public.severity_level NOT NULL,
  message text NOT NULL DEFAULT '',
  acknowledged_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_patient_alert_events_patient ON public.patient_alert_events (patient_id, triggered_at DESC);

-- ---------------------------------------------------------------------------
-- medications: FK opcional para catálogo
-- ---------------------------------------------------------------------------
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS medication_reference_id uuid REFERENCES public.medication_reference (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_medications_medication_reference_id ON public.medications (medication_reference_id)
  WHERE medication_reference_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Integridade: guideline pertence ao mesmo protocol_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._protocol_guideline_same_protocol()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.monitoring_guidelines mg
    WHERE mg.id = NEW.guideline_id AND mg.protocol_id = NEW.protocol_id
  ) THEN
    RAISE EXCEPTION 'monitoring_guidelines.protocol_id must match protocol_guideline_windows.protocol_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protocol_guideline_windows_same_protocol ON public.protocol_guideline_windows;
CREATE TRIGGER tr_protocol_guideline_windows_same_protocol
  BEFORE INSERT OR UPDATE OF protocol_id, guideline_id ON public.protocol_guideline_windows
  FOR EACH ROW EXECUTE PROCEDURE public._protocol_guideline_same_protocol();

CREATE OR REPLACE FUNCTION public._protocol_alert_rule_link_same_protocol()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.link_guideline_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.monitoring_guidelines mg
    WHERE mg.id = NEW.link_guideline_id AND mg.protocol_id = NEW.protocol_id
  ) THEN
    RAISE EXCEPTION 'link_guideline_id must belong to the same protocol';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protocol_alert_rules_link_protocol ON public.protocol_alert_rules;
CREATE TRIGGER tr_protocol_alert_rules_link_protocol
  BEFORE INSERT OR UPDATE OF protocol_id, link_guideline_id ON public.protocol_alert_rules
  FOR EACH ROW EXECUTE PROCEDURE public._protocol_alert_rule_link_same_protocol();

CREATE OR REPLACE FUNCTION public._protocol_medication_watch_same_protocol()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.monitoring_guidelines mg
    WHERE mg.id = NEW.guideline_id AND mg.protocol_id = NEW.protocol_id
  ) THEN
    RAISE EXCEPTION 'monitoring_guidelines.protocol_id must match protocol_medication_watch.protocol_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protocol_medication_watch_same_protocol ON public.protocol_medication_watch;
CREATE TRIGGER tr_protocol_medication_watch_same_protocol
  BEFORE INSERT OR UPDATE OF protocol_id, guideline_id ON public.protocol_medication_watch
  FOR EACH ROW EXECUTE PROCEDURE public._protocol_medication_watch_same_protocol();

-- ---------------------------------------------------------------------------
-- RPC: âncoras de dia no ciclo (invoker; RLS em treatment_cycles / infusões)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_protocol_day_anchors(
  p_cycle_id uuid,
  p_on date DEFAULT ((timezone('UTC', now()))::date)
)
RETURNS TABLE (
  cycle_id uuid,
  patient_id uuid,
  protocol_id uuid,
  start_date date,
  days_from_cycle_start integer,
  days_from_last_infusion integer,
  last_infusion_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    tc.id,
    tc.patient_id,
    tc.protocol_id,
    tc.start_date,
    (p_on - tc.start_date)::integer AS days_from_cycle_start,
    li.days_from_last_infusion,
    li.last_infusion_at
  FROM public.treatment_cycles tc
  LEFT JOIN LATERAL (
    SELECT
      ti.session_at AS last_infusion_at,
      (p_on - (ti.session_at AT TIME ZONE 'UTC')::date)::integer AS days_from_last_infusion
    FROM public.treatment_infusions ti
    WHERE ti.cycle_id = tc.id
      AND ti.status = 'completed'::public.infusion_session_status
    ORDER BY ti.session_at DESC
    LIMIT 1
  ) li ON true
  WHERE tc.id = p_cycle_id;
$$;

COMMENT ON FUNCTION public.compute_protocol_day_anchors IS 'Dias desde início do ciclo e desde última infusão completada; usado para filtrar janelas/regras do protocolo.';

GRANT EXECUTE ON FUNCTION public.compute_protocol_day_anchors(uuid, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS (catálogo: leitura authenticated; escrita hospital_admin com lotação)
-- ---------------------------------------------------------------------------
ALTER TABLE public.medication_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_guideline_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_medication_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medication_reference_select_authenticated"
ON public.medication_reference FOR SELECT TO authenticated USING (true);

CREATE POLICY "medication_reference_mutate_hospital_admin"
ON public.medication_reference FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

CREATE POLICY "protocol_guideline_windows_select_authenticated"
ON public.protocol_guideline_windows FOR SELECT TO authenticated USING (true);

CREATE POLICY "protocol_guideline_windows_mutate_hospital_admin"
ON public.protocol_guideline_windows FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

CREATE POLICY "protocol_alert_rules_select_authenticated"
ON public.protocol_alert_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "protocol_alert_rules_mutate_hospital_admin"
ON public.protocol_alert_rules FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

CREATE POLICY "protocol_medication_watch_select_authenticated"
ON public.protocol_medication_watch FOR SELECT TO authenticated USING (true);

CREATE POLICY "protocol_medication_watch_mutate_hospital_admin"
ON public.protocol_medication_watch FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

-- Paciente: próprios eventos; staff do mesmo hospital
CREATE POLICY "patient_alert_events_select_patient_or_staff"
ON public.patient_alert_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_events.patient_id
      AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = patient_alert_events.patient_id
      AND sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "patient_alert_events_insert_patient_own"
ON public.patient_alert_events FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_alert_events.patient_id
      AND p.profile_id = (select auth.uid())
  )
);
