-- CTCAE / ePROM: termos, respostas, ae_flow em symptom_logs; episódios de monitorização; readiness; risk_scores

-- ---------------------------------------------------------------------------
-- Extensão alert_rules (defaults aplicados no código se ausentes)
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.hospitals.alert_rules IS
  'JSON: fever_celsius_min, alert_window_hours, ctcae_yellow_min_grade (default 2), ctcae_red_min_grade (default 3).';

-- ---------------------------------------------------------------------------
-- symptom_logs: fluxo ePROM + grau AE agregado
-- ---------------------------------------------------------------------------
ALTER TABLE public.symptom_logs
  ADD COLUMN IF NOT EXISTS flow_context jsonb,
  ADD COLUMN IF NOT EXISTS ae_max_grade smallint;

ALTER TABLE public.symptom_logs
  ADD CONSTRAINT symptom_logs_ae_max_grade_chk
  CHECK (ae_max_grade IS NULL OR (ae_max_grade >= 0 AND ae_max_grade <= 5));

COMMENT ON COLUMN public.symptom_logs.flow_context IS 'ePROM: nós visitados, flow_id, respostas (JSON).';
COMMENT ON COLUMN public.symptom_logs.ae_max_grade IS 'Maior grau CTCAE (0–5) deste registo quando entry_kind = ae_flow.';

ALTER TABLE public.symptom_logs DROP CONSTRAINT IF EXISTS symptom_logs_entry_kind_chk;
ALTER TABLE public.symptom_logs
  ADD CONSTRAINT symptom_logs_entry_kind_chk CHECK (entry_kind IN ('legacy', 'prd', 'ae_flow'));

ALTER TABLE public.symptom_logs DROP CONSTRAINT IF EXISTS symptom_logs_levels_chk;
ALTER TABLE public.symptom_logs
  ADD CONSTRAINT symptom_logs_levels_chk CHECK (
    (
      entry_kind = 'legacy'
      AND symptom_category IS NOT NULL
      AND severity IS NOT NULL
      AND pain_level IS NULL
      AND nausea_level IS NULL
      AND fatigue_level IS NULL
      AND ae_max_grade IS NULL
      AND flow_context IS NULL
    )
    OR (
      entry_kind = 'prd'
      AND symptom_category IS NULL
      AND severity IS NULL
      AND pain_level IS NOT NULL
      AND nausea_level IS NOT NULL
      AND fatigue_level IS NOT NULL
      AND pain_level >= 0
      AND pain_level <= 10
      AND nausea_level >= 0
      AND nausea_level <= 10
      AND fatigue_level >= 0
      AND fatigue_level <= 10
      AND ae_max_grade IS NULL
      AND flow_context IS NULL
    )
    OR (
      entry_kind = 'ae_flow'
      AND symptom_category IS NULL
      AND severity IS NULL
      AND pain_level IS NULL
      AND nausea_level IS NULL
      AND fatigue_level IS NULL
      AND ae_max_grade IS NOT NULL
      AND ae_max_grade >= 0
      AND ae_max_grade <= 5
    )
  );

CREATE INDEX IF NOT EXISTS idx_symptom_logs_entry_ae ON public.symptom_logs (patient_id, entry_kind, logged_at DESC)
  WHERE entry_kind = 'ae_flow';

-- ---------------------------------------------------------------------------
-- Catálogo CTCAE / PRO-CTCAE (subset mínimo; LOINC para FHIR)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ctcae_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_pt text NOT NULL,
  loinc_code text,
  snomed_code text,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.ctcae_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctcae_terms_select_authenticated"
ON public.ctcae_terms FOR SELECT TO authenticated
USING (true);

INSERT INTO public.ctcae_terms (slug, label_pt, loinc_code, snomed_code, sort_order)
VALUES
  ('nausea', 'Náusea', '64794-8', '422587007', 1),
  ('vomiting', 'Vómitos', '422400008', '422400008', 2),
  ('fatigue', 'Fadiga', '64750-2', '84229001', 3),
  ('pain', 'Dor', '75325-1', '22253000', 4),
  ('fever', 'Febre', '8310-5', '386661006', 5)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Respostas por termo (um log pode cobrir vários termos num fluxo composto)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.symptom_ae_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_log_id uuid NOT NULL REFERENCES public.symptom_logs (id) ON DELETE CASCADE,
  ctcae_term_id uuid NOT NULL REFERENCES public.ctcae_terms (id) ON DELETE RESTRICT,
  grade smallint NOT NULL CHECK (grade >= 0 AND grade <= 5),
  raw_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (symptom_log_id, ctcae_term_id)
);

CREATE INDEX IF NOT EXISTS idx_symptom_ae_responses_log ON public.symptom_ae_responses (symptom_log_id);

ALTER TABLE public.symptom_ae_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "symptom_ae_responses_select"
ON public.symptom_ae_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.symptom_logs sl
    INNER JOIN public.patients p ON p.id = sl.patient_id
    WHERE sl.id = symptom_ae_responses.symptom_log_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.symptom_logs sl
    INNER JOIN public.patient_caregivers pc ON pc.patient_id = sl.patient_id
    WHERE sl.id = symptom_ae_responses.symptom_log_id AND pc.caregiver_profile_id = (select auth.uid())
  )
);

CREATE POLICY "symptom_ae_responses_insert"
ON public.symptom_ae_responses FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.symptom_logs sl
    INNER JOIN public.patients p ON p.id = sl.patient_id
    WHERE sl.id = symptom_ae_responses.symptom_log_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.symptom_logs sl
    INNER JOIN public.patient_caregivers pc ON pc.patient_id = sl.patient_id
    WHERE sl.id = symptom_ae_responses.symptom_log_id AND pc.caregiver_profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Episódios de monitorização (ex.: febre)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monitoring_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('fever_watch', 'other')),
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  next_prompt_at timestamptz,
  source_symptom_log_id uuid REFERENCES public.symptom_logs (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_episodes_patient_active
  ON public.monitoring_episodes (patient_id, resolved_at)
  WHERE resolved_at IS NULL;

ALTER TABLE public.monitoring_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_episodes_select_patient"
ON public.monitoring_episodes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = monitoring_episodes.patient_id AND p.profile_id = (select auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = monitoring_episodes.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
  )
);

CREATE POLICY "monitoring_episodes_mutate_patient"
ON public.monitoring_episodes FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = monitoring_episodes.patient_id AND p.profile_id = (select auth.uid()))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = monitoring_episodes.patient_id AND p.profile_id = (select auth.uid()))
);

-- ---------------------------------------------------------------------------
-- Scores preditivos (MVP: armazenamento; modelo externo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  target_ae_slug text,
  horizon_days int NOT NULL DEFAULT 7 CHECK (horizon_days > 0 AND horizon_days <= 90),
  probability numeric(5, 4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  model_version text NOT NULL DEFAULT '0.0.0',
  computed_at timestamptz NOT NULL DEFAULT now(),
  features_summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_patient_computed
  ON public.risk_scores (patient_id, computed_at DESC);

ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_scores_select_staff"
ON public.risk_scores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = risk_scores.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
  )
);

CREATE POLICY "risk_scores_select_patient"
ON public.risk_scores FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = risk_scores.patient_id AND p.profile_id = (select auth.uid()))
);

-- Inserção: service_role ignora RLS no Supabase; políticas opcionais para RPC futuras

-- ---------------------------------------------------------------------------
-- Vista: readiness heurístico para próximo ciclo (MVP)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.cycle_readiness AS
SELECT DISTINCT ON (p.id)
  p.id AS patient_id,
  p.hospital_id,
  tc.id AS cycle_id,
  tc.protocol_name,
  tc.status AS cycle_status,
  tc.start_date,
  (
    SELECT MAX(sl.logged_at)
    FROM public.symptom_logs sl
    WHERE sl.patient_id = p.id
      AND sl.entry_kind = 'ae_flow'
      AND sl.ae_max_grade IS NOT NULL
      AND sl.ae_max_grade >= 3
  ) AS last_high_ae_at,
  (
    SELECT MAX(sl.logged_at)
    FROM public.symptom_logs sl
    WHERE sl.patient_id = p.id AND sl.symptom_category = 'fever' AND sl.body_temperature IS NOT NULL
  ) AS last_fever_log_at,
  (
    SELECT BOOL_OR(md.ai_extracted_json IS NOT NULL)
    FROM public.medical_documents md
    WHERE md.patient_id = p.id
      AND md.uploaded_at > now() - interval '21 days'
  ) AS has_recent_labs_doc,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.symptom_logs sl
      WHERE sl.patient_id = p.id
        AND sl.logged_at > now() - interval '72 hours'
        AND (
          (sl.entry_kind = 'ae_flow' AND sl.ae_max_grade >= 3)
          OR (sl.symptom_category = 'fever' AND sl.body_temperature >= 38.0)
        )
    ) THEN 'hold'
    WHEN EXISTS (
      SELECT 1 FROM public.treatment_infusions ti
      WHERE ti.patient_id = p.id AND ti.status = 'completed' AND ti.session_at > now() - interval '14 days'
    )
      OR EXISTS (
        SELECT 1 FROM public.medical_documents md
        WHERE md.patient_id = p.id AND md.uploaded_at > now() - interval '14 days'
      )
    THEN 'likely_ok'
    ELSE 'review'
  END AS readiness_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.symptom_logs sl
      WHERE sl.patient_id = p.id
        AND sl.logged_at > now() - interval '72 hours'
        AND sl.entry_kind = 'ae_flow'
        AND sl.ae_max_grade >= 3
    ) THEN ARRAY['Toxicidade AE grau ≥3 (72h)']::text[]
    WHEN EXISTS (
      SELECT 1 FROM public.symptom_logs sl
      WHERE sl.patient_id = p.id
        AND sl.logged_at > now() - interval '72 hours'
        AND sl.symptom_category = 'fever'
        AND sl.body_temperature >= 38.0
    ) THEN ARRAY['Febre ≥38 °C (72h)']::text[]
    WHEN NOT EXISTS (
      SELECT 1 FROM public.medical_documents md WHERE md.patient_id = p.id AND md.uploaded_at > now() - interval '21 days'
    ) THEN ARRAY['Sem documento laboratorial recente (21d) — verificar']::text[]
    ELSE ARRAY[]::text[]
  END AS readiness_reasons
FROM public.patients p
LEFT JOIN public.treatment_cycles tc ON tc.patient_id = p.id AND tc.status = 'active'
ORDER BY p.id, tc.start_date DESC NULLS LAST;

COMMENT ON VIEW public.cycle_readiness IS 'MVP heurístico: não substitui decisão clínica.';

GRANT SELECT ON public.cycle_readiness TO authenticated;

-- ---------------------------------------------------------------------------
-- Triagem: thresholds por hospital em alert_rules
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ctcae_triage_thresholds(p_patient_id uuid)
RETURNS TABLE (yellow_min int, red_min int)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE((h.alert_rules->>'ctcae_yellow_min_grade')::int, 2) AS yellow_min,
    COALESCE((h.alert_rules->>'ctcae_red_min_grade')::int, 3) AS red_min
  FROM public.patients p
  LEFT JOIN public.hospitals h ON h.id = p.hospital_id
  WHERE p.id = p_patient_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.compute_symptom_triage_semaphore(sl public.symptom_logs)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  mx int;
  sev text;
  temp numeric;
  yg int;
  rg int;
  g int;
BEGIN
  IF sl.entry_kind = 'ae_flow' AND sl.ae_max_grade IS NOT NULL THEN
    SELECT t.yellow_min, t.red_min INTO yg, rg FROM public.ctcae_triage_thresholds(sl.patient_id) t;
    g := sl.ae_max_grade;
    IF g >= rg THEN
      RETURN 'red';
    ELSIF g >= yg THEN
      RETURN 'yellow';
    ELSE
      RETURN 'green';
    END IF;
  END IF;

  IF sl.entry_kind = 'prd' THEN
    mx := greatest(coalesce(sl.pain_level, 0), coalesce(sl.nausea_level, 0), coalesce(sl.fatigue_level, 0));
    IF mx >= 8 THEN
      RETURN 'red';
    ELSIF mx >= 4 THEN
      RETURN 'yellow';
    ELSE
      RETURN 'green';
    END IF;
  END IF;

  sev := coalesce(sl.severity, '');
  IF sev IN ('life_threatening', 'severe') THEN
    RETURN 'red';
  ELSIF sev = 'moderate' THEN
    RETURN 'yellow';
  END IF;

  IF sl.symptom_category = 'fever' AND sl.body_temperature IS NOT NULL THEN
    temp := sl.body_temperature::numeric;
    IF temp >= 37.8 THEN
      RETURN 'red';
    ELSIF temp >= 37.3 THEN
      RETURN 'yellow';
    END IF;
  END IF;

  RETURN 'green';
END;
$$;

DROP TRIGGER IF EXISTS trg_symptom_logs_set_triage ON public.symptom_logs;
CREATE TRIGGER trg_symptom_logs_set_triage
BEFORE INSERT OR UPDATE OF entry_kind, severity, pain_level, nausea_level, fatigue_level, body_temperature, symptom_category, ae_max_grade
ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.trg_symptom_logs_set_triage();

CREATE OR REPLACE FUNCTION public.set_symptom_requires_action()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  mx int;
  rg int;
BEGIN
  IF NEW.entry_kind = 'prd' THEN
    mx := GREATEST(COALESCE(NEW.pain_level, 0), COALESCE(NEW.nausea_level, 0), COALESCE(NEW.fatigue_level, 0));
    NEW.requires_action := mx >= 8;
  ELSIF NEW.entry_kind = 'ae_flow' AND NEW.ae_max_grade IS NOT NULL THEN
    SELECT t.red_min INTO rg FROM public.ctcae_triage_thresholds(NEW.patient_id) t;
    NEW.requires_action := NEW.ae_max_grade >= rg;
  ELSE
    NEW.requires_action := NEW.severity IN ('severe', 'life_threatening');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_symptom_requires_action ON public.symptom_logs;
CREATE TRIGGER trg_symptom_requires_action
BEFORE INSERT OR UPDATE OF severity, pain_level, nausea_level, fatigue_level, entry_kind, ae_max_grade ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.set_symptom_requires_action();
