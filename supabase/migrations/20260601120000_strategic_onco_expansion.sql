-- Strategic expansion: care phases, hospital branding, clinical notes, timeline, tumor/PRO, merged alert RPCs, biomarker critical trigger.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.patient_care_phase AS ENUM (
    'active_treatment',
    'consolidation',
    'maintenance',
    'follow_up',
    'palliative'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.clinical_note_type AS ENUM (
    'round_note',
    'nutrition_note',
    'psych_note',
    'nursing_note'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.timeline_event_kind AS ENUM (
    'diagnosis',
    'surgery',
    'cycle_start',
    'infusion',
    'imaging',
    'lab_critical',
    'toxicity',
    'hospitalization',
    'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tumor_response_category AS ENUM (
    'CR',
    'PR',
    'SD',
    'PD',
    'NE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- patients: care phase
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS care_phase public.patient_care_phase NOT NULL DEFAULT 'active_treatment';

COMMENT ON COLUMN public.patients.care_phase IS 'Fase assistencial para adaptar abas do dossiê (tratamento ativo vs seguimento).';

-- ---------------------------------------------------------------------------
-- hospitals: B2B branding & webhooks
-- ---------------------------------------------------------------------------
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_color_hex text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS subdomain text,
  ADD COLUMN IF NOT EXISTS triage_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS alert_webhook_url text,
  ADD COLUMN IF NOT EXISTS alert_webhook_secret text,
  ADD COLUMN IF NOT EXISTS fhir_export_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hospitals.triage_config IS 'JSON: priorização de triagem (ex.: boost_inactive_days).';
COMMENT ON COLUMN public.hospitals.alert_webhook_url IS 'Webhook para alertas críticos (sintomas, labs); opcional.';

-- ---------------------------------------------------------------------------
-- hospital_settings (1:1) — campos adicionais sem poluir hospitals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hospital_settings (
  hospital_id uuid PRIMARY KEY REFERENCES public.hospitals (id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  pro_whatsapp_template text,
  settings_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.hospital_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_settings_select_staff"
ON public.hospital_settings FOR SELECT TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
);

CREATE POLICY "hospital_settings_mutate_admin"
ON public.hospital_settings FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
      AND sa.hospital_id = hospital_settings.hospital_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
      AND sa.hospital_id = hospital_settings.hospital_id
  )
);

-- ---------------------------------------------------------------------------
-- patient_alert_rules: canais e janela ativa
-- ---------------------------------------------------------------------------
ALTER TABLE public.patient_alert_rules
  ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '{"push":true,"whatsapp":false,"sms":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS active_from time,
  ADD COLUMN IF NOT EXISTS active_until time,
  ADD COLUMN IF NOT EXISTS snooze_hours int;

-- ---------------------------------------------------------------------------
-- biomarker_logs: avaliação tumoral e criticidade
-- ---------------------------------------------------------------------------
ALTER TABLE public.biomarker_logs
  ADD COLUMN IF NOT EXISTS evaluation_type text,
  ADD COLUMN IF NOT EXISTS is_critical boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS critical_low numeric,
  ADD COLUMN IF NOT EXISTS critical_high numeric,
  ADD COLUMN IF NOT EXISTS target_lesion_sum_mm numeric,
  ADD COLUMN IF NOT EXISTS baseline_sum_mm numeric,
  ADD COLUMN IF NOT EXISTS response_category text;

-- ---------------------------------------------------------------------------
-- clinical_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role_at_creation public.user_role,
  note_type public.clinical_note_type NOT NULL DEFAULT 'round_note',
  note_text text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient_created ON public.clinical_notes (patient_id, created_at DESC);

ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_notes_select_staff"
ON public.clinical_notes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = clinical_notes.patient_id AND sa.staff_id = (select auth.uid())
  )
  AND (
    NOT clinical_notes.is_private
    OR clinical_notes.author_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = (select auth.uid())
        AND pr.role IN ('doctor'::public.user_role, 'hospital_admin'::public.user_role)
    )
  )
);

CREATE POLICY "clinical_notes_insert_staff"
ON public.clinical_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = clinical_notes.patient_id AND sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "clinical_notes_update_author"
ON public.clinical_notes FOR UPDATE TO authenticated
USING (author_id = (select auth.uid()))
WITH CHECK (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- clinical_timeline_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  event_kind public.timeline_event_kind NOT NULL DEFAULT 'custom',
  event_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  severity public.severity_level,
  staff_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  linked_cycle_id uuid REFERENCES public.treatment_cycles (id) ON DELETE SET NULL,
  linked_document_id uuid REFERENCES public.medical_documents (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_timeline_patient ON public.clinical_timeline_events (patient_id, event_at DESC);

ALTER TABLE public.clinical_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_timeline_select_staff"
ON public.clinical_timeline_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = clinical_timeline_events.patient_id AND sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "clinical_timeline_mutate_staff"
ON public.clinical_timeline_events FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = clinical_timeline_events.patient_id AND sa.staff_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = clinical_timeline_events.patient_id AND sa.staff_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- tumor_evaluations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tumor_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.treatment_cycles (id) ON DELETE SET NULL,
  evaluation_date date NOT NULL,
  modality text NOT NULL DEFAULT 'CT',
  sum_lesions_mm numeric,
  response_category public.tumor_response_category,
  percent_change_from_baseline numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tumor_eval_patient_date ON public.tumor_evaluations (patient_id, evaluation_date DESC);

ALTER TABLE public.tumor_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tumor_eval_select_staff"
ON public.tumor_evaluations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = tumor_evaluations.patient_id AND sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "tumor_eval_mutate_staff"
ON public.tumor_evaluations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = tumor_evaluations.patient_id AND sa.staff_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = tumor_evaluations.patient_id AND sa.staff_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- pro_questionnaire_responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pro_questionnaire_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  questionnaire_type text NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric,
  domain_scores jsonb,
  filled_at timestamptz NOT NULL DEFAULT now(),
  filled_by text NOT NULL DEFAULT 'patient' CHECK (filled_by IN ('patient', 'staff'))
);

CREATE INDEX IF NOT EXISTS idx_pro_q_patient ON public.pro_questionnaire_responses (patient_id, filled_at DESC);

ALTER TABLE public.pro_questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_q_select_staff"
ON public.pro_questionnaire_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = pro_questionnaire_responses.patient_id AND sa.staff_id = (select auth.uid())
  )
);

CREATE POLICY "pro_q_mutate_staff"
ON public.pro_questionnaire_responses FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = pro_questionnaire_responses.patient_id AND sa.staff_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = pro_questionnaire_responses.patient_id AND sa.staff_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- hospital_protocols
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hospital_protocols (
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES public.protocols (id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  custom_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hospital_id, protocol_id)
);

ALTER TABLE public.hospital_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_protocols_select_staff"
ON public.hospital_protocols FOR SELECT TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
);

CREATE POLICY "hospital_protocols_mutate_admin"
ON public.hospital_protocols FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
      AND sa.hospital_id = hospital_protocols.hospital_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
      AND sa.hospital_id = hospital_protocols.hospital_id
  )
);

-- ---------------------------------------------------------------------------
-- Staff pode inserir eventos de alerta (ex.: pipeline automático)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "patient_alert_events_insert_staff_same_hospital" ON public.patient_alert_events;
CREATE POLICY "patient_alert_events_insert_staff_same_hospital"
ON public.patient_alert_events FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    JOIN public.staff_assignments sa ON sa.hospital_id = p.hospital_id
    WHERE p.id = patient_alert_events.patient_id AND sa.staff_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- RPC: get_clinical_notes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_clinical_notes(p_patient_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  note_text text,
  note_type public.clinical_note_type,
  is_private boolean,
  created_at timestamptz,
  author_name text,
  author_role public.user_role
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.note_text,
    n.note_type,
    n.is_private,
    n.created_at,
    pr.full_name AS author_name,
    pr.role AS author_role
  FROM public.clinical_notes n
  JOIN public.profiles pr ON pr.id = n.author_id
  WHERE n.patient_id = p_patient_id
  ORDER BY n.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 200);
$$;

GRANT EXECUTE ON FUNCTION public.get_clinical_notes(uuid, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get_tumor_response_history
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tumor_response_history(p_patient_id uuid)
RETURNS SETOF public.tumor_evaluations
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT te.*
  FROM public.tumor_evaluations te
  WHERE te.patient_id = p_patient_id
  ORDER BY te.evaluation_date ASC, te.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_tumor_response_history(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get_ctcae_matrix — agregação simples por ciclo (via symptom_logs.cycle_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ctcae_matrix(p_patient_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(sub.j ORDER BY (sub.j->>'logged_at')::timestamptz DESC)
      FROM (
        SELECT jsonb_build_object(
          'cycle_id', cycle_id,
          'symptom_category', symptom_category,
          'severity', severity::text,
          'logged_at', logged_at
        ) AS j
        FROM public.symptom_logs
        WHERE patient_id = p_patient_id
        ORDER BY logged_at DESC
        LIMIT 500
      ) sub
    ),
    '[]'::jsonb
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_ctcae_matrix(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get_merged_alert_rules (LANGUAGE sql: evita PL/pgSQL a tratar variáveis como relações)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_merged_alert_rules(p_patient_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH patient_ctx AS (
    SELECT
      p.hospital_id,
      lp.protocol_id AS active_protocol_id
    FROM public.patients p
    LEFT JOIN LATERAL (
      SELECT tc.protocol_id
      FROM public.treatment_cycles tc
      WHERE tc.patient_id = p.id AND tc.status = 'active'::public.cycle_status
      ORDER BY tc.start_date DESC
      LIMIT 1
    ) lp ON true
    WHERE p.id = p_patient_id
  ),
  hospital_json AS (
    SELECT jsonb_build_object(
      'alert_rules', hosp.alert_rules,
      'triage_config', hosp.triage_config,
      'brand_color_hex', hosp.brand_color_hex,
      'display_name', COALESCE(hosp.display_name, hosp.name),
      'logo_url', hosp.logo_url,
      'fhir_export_enabled', hosp.fhir_export_enabled
    ) AS j
    FROM patient_ctx c
    INNER JOIN public.hospitals hosp ON hosp.id = c.hospital_id
  ),
  protocol_json AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(par.*)), '[]'::jsonb) AS j
    FROM patient_ctx c
    INNER JOIN public.protocol_alert_rules par ON par.protocol_id = c.active_protocol_id
  ),
  patient_json AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC), '[]'::jsonb) AS j
    FROM public.patient_alert_rules r
    WHERE r.patient_id = p_patient_id AND r.enabled = true
  )
  SELECT jsonb_build_object(
    'hospital', COALESCE((SELECT hj.j FROM hospital_json hj LIMIT 1), '{}'::jsonb),
    'protocol_rules', COALESCE((SELECT pj.j FROM protocol_json pj LIMIT 1), '[]'::jsonb),
    'patient_rules', COALESCE((SELECT pat.j FROM patient_json pat LIMIT 1), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_merged_alert_rules(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: biomarker criticidade + evento
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_biomarker_logs_critical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  crit boolean := false;
BEGIN
  IF NEW.value_numeric IS NOT NULL THEN
    IF NEW.critical_low IS NOT NULL AND NEW.value_numeric < NEW.critical_low THEN
      crit := true;
    END IF;
    IF NEW.critical_high IS NOT NULL AND NEW.value_numeric > NEW.critical_high THEN
      crit := true;
    END IF;
  END IF;
  NEW.is_critical := crit;

  IF crit AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.is_critical IS DISTINCT FROM NEW.is_critical OR OLD.value_numeric IS DISTINCT FROM NEW.value_numeric))) THEN
    INSERT INTO public.patient_alert_events (
      patient_id,
      rule_id,
      triggered_at,
      payload,
      severity_level,
      message
    ) VALUES (
      NEW.patient_id,
      NULL,
      now(),
      jsonb_build_object('biomarker_log_id', NEW.id, 'name', NEW.name, 'value', NEW.value_numeric),
      'critical'::public.severity_level,
      COALESCE('Valor crítico: ' || NEW.name || ' = ' || NEW.value_numeric::text, 'Biomarcador crítico')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_biomarker_logs_critical ON public.biomarker_logs;
CREATE TRIGGER trg_biomarker_logs_critical
  BEFORE INSERT OR UPDATE OF value_numeric, critical_low, critical_high ON public.biomarker_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_biomarker_logs_critical();
