-- Kaiku-style DTx: triagem semáforo, tarefas clínicas, educação, cuidador, anexos, mensagens contextuais

-- ---------------------------------------------------------------------------
-- Sintomas: triagem semáforo + anexo + quem registou (paciente vs cuidador)
-- ---------------------------------------------------------------------------
ALTER TABLE public.symptom_logs
  ADD COLUMN IF NOT EXISTS triage_semaphore text,
  ADD COLUMN IF NOT EXISTS attachment_storage_path text,
  ADD COLUMN IF NOT EXISTS logged_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'symptom_logs_triage_semaphore_chk'
  ) THEN
    ALTER TABLE public.symptom_logs
      ADD CONSTRAINT symptom_logs_triage_semaphore_chk
      CHECK (triage_semaphore IS NULL OR triage_semaphore IN ('green', 'yellow', 'red'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_symptom_logs_triage_logged
  ON public.symptom_logs (triage_semaphore, logged_at DESC)
  WHERE triage_semaphore IS NOT NULL;

COMMENT ON COLUMN public.symptom_logs.triage_semaphore IS 'Kaiku-style: green mild, yellow moderate (enfermagem 24h), red critical (médico/PS).';
COMMENT ON COLUMN public.symptom_logs.logged_by_profile_id IS 'auth.uid() do cuidador se diferente do paciente; NULL tratado como paciente.';

-- ---------------------------------------------------------------------------
-- Cuidador: código de emparelhamento + vínculo
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS caregiver_pairing_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_caregiver_pairing_code
  ON public.patients (caregiver_pairing_code)
  WHERE caregiver_pairing_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.patient_caregivers (
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  caregiver_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, caregiver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_caregivers_caregiver
  ON public.patient_caregivers (caregiver_profile_id);

ALTER TABLE public.patient_caregivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_caregivers_select_patient_or_caregiver"
ON public.patient_caregivers FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_caregivers.patient_id AND p.profile_id = (select auth.uid()))
  OR caregiver_profile_id = (select auth.uid())
);

CREATE POLICY "patient_caregivers_insert_patient"
ON public.patient_caregivers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_caregivers.patient_id AND p.profile_id = (select auth.uid()))
);

CREATE POLICY "patient_caregivers_delete_patient"
ON public.patient_caregivers FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_caregivers.patient_id AND p.profile_id = (select auth.uid()))
);

-- Emparelhamento por código (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.regenerate_caregiver_pairing_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  new_code text;
BEGIN
  SELECT id INTO pid FROM public.patients WHERE profile_id = auth.uid();
  IF pid IS NULL THEN
    RAISE EXCEPTION 'not_patient';
  END IF;
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  UPDATE public.patients SET caregiver_pairing_code = new_code WHERE id = pid;
  RETURN new_code;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_caregiver_pairing_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_caregiver_pairing_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_caregiver_pairing(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
  uid uuid := auth.uid();
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;
  SELECT id INTO pid FROM public.patients WHERE caregiver_pairing_code = upper(trim(p_code));
  IF pid IS NULL THEN
    RAISE EXCEPTION 'code_not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.patients WHERE id = pid AND profile_id = uid) THEN
    RAISE EXCEPTION 'cannot_pair_self';
  END IF;
  INSERT INTO public.patient_caregivers (patient_id, caregiver_profile_id)
  VALUES (pid, uid)
  ON CONFLICT (patient_id, caregiver_profile_id) DO NOTHING;
  UPDATE public.patients SET caregiver_pairing_code = NULL WHERE id = pid;
  RETURN pid;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_caregiver_pairing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_caregiver_pairing(text) TO authenticated;

-- Expandir INSERT em symptom_logs para cuidador aprovado
DROP POLICY IF EXISTS "symptom_logs_insert_consolidated" ON public.symptom_logs;

CREATE POLICY "symptom_logs_insert_consolidated"
ON public.symptom_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = symptom_logs.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patient_caregivers pc
    WHERE pc.patient_id = symptom_logs.patient_id
      AND pc.caregiver_profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Tarefas clínicas (dashboard hospitalar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  symptom_log_id uuid NOT NULL REFERENCES public.symptom_logs (id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN ('nursing_followup_24h', 'physician_urgent', 'emergency_ed')),
  triage_semaphore text NOT NULL CHECK (triage_semaphore IN ('yellow', 'red')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinical_tasks_one_per_symptom_log
  ON public.clinical_tasks (symptom_log_id);

CREATE INDEX IF NOT EXISTS idx_clinical_tasks_hospital_status
  ON public.clinical_tasks (hospital_id, status, created_at DESC);

ALTER TABLE public.clinical_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinical_tasks_select_staff"
ON public.clinical_tasks FOR SELECT TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
);

CREATE POLICY "clinical_tasks_update_staff"
ON public.clinical_tasks FOR UPDATE TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
)
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
);

-- Paciente vê tarefas ligadas a si (opcional, para transparência)
CREATE POLICY "clinical_tasks_select_patient"
ON public.clinical_tasks FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = clinical_tasks.patient_id AND p.profile_id = (select auth.uid()))
);

-- ---------------------------------------------------------------------------
-- Conteúdo educacional
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.educational_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  symptom_tags text[] NOT NULL DEFAULT '{}',
  cancer_types text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_educational_content_tags ON public.educational_content USING gin (symptom_tags);

CREATE TABLE IF NOT EXISTS public.patient_content_views (
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.educational_content (id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (patient_id, content_id)
);

ALTER TABLE public.educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "educational_content_select_authenticated"
ON public.educational_content FOR SELECT TO authenticated
USING (true);

CREATE POLICY "patient_content_views_all_own"
ON public.patient_content_views FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_content_views.patient_id AND p.profile_id = (select auth.uid()))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_content_views.patient_id AND p.profile_id = (select auth.uid()))
);

-- ---------------------------------------------------------------------------
-- Mensagens outbound: contexto de sintoma
-- ---------------------------------------------------------------------------
ALTER TABLE public.outbound_messages
  ADD COLUMN IF NOT EXISTS symptom_log_id uuid REFERENCES public.symptom_logs (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_outbound_messages_symptom_log
  ON public.outbound_messages (symptom_log_id)
  WHERE symptom_log_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Função: calcular triagem semáforo (alinha app + BD)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_symptom_triage_semaphore(sl public.symptom_logs)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  mx int;
  sev text;
  temp numeric;
BEGIN
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

CREATE OR REPLACE FUNCTION public.trg_symptom_logs_set_triage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.triage_semaphore := public.compute_symptom_triage_semaphore(NEW);
  IF NEW.logged_by_profile_id IS NULL THEN
    NEW.logged_by_profile_id := (select auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_symptom_logs_set_triage ON public.symptom_logs;
CREATE TRIGGER trg_symptom_logs_set_triage
BEFORE INSERT OR UPDATE OF entry_kind, severity, pain_level, nausea_level, fatigue_level, body_temperature, symptom_category
ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.trg_symptom_logs_set_triage();

-- Tarefas após insert
CREATE OR REPLACE FUNCTION public.trg_symptom_logs_create_clinical_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hid uuid;
  sem text := NEW.triage_semaphore;
BEGIN
  IF sem IS NULL OR sem = 'green' THEN
    RETURN NEW;
  END IF;
  hid := NEW.hospital_id;
  IF hid IS NULL THEN
    SELECT p.hospital_id INTO hid FROM public.patients p WHERE p.id = NEW.patient_id;
  END IF;
  IF hid IS NULL THEN
    RETURN NEW;
  END IF;

  IF sem = 'yellow' THEN
    INSERT INTO public.clinical_tasks (
      hospital_id, patient_id, symptom_log_id, task_type, triage_semaphore, title, description, due_at
    ) VALUES (
      hid,
      NEW.patient_id,
      NEW.id,
      'nursing_followup_24h',
      'yellow',
      'Acompanhamento de enfermagem (24h)',
      'Triagem amarela: sintomas moderados registados no diário.',
      now() + interval '24 hours'
    )
    ON CONFLICT (symptom_log_id) DO NOTHING;
  ELSIF sem = 'red' THEN
    INSERT INTO public.clinical_tasks (
      hospital_id, patient_id, symptom_log_id, task_type, triage_semaphore, title, description, due_at
    ) VALUES (
      hid,
      NEW.patient_id,
      NEW.id,
      'physician_urgent',
      'red',
      'Avaliação médica urgente',
      'Triagem vermelha: sintomas graves ou febre ≥ 37,8 °C. Verificar contacto com doente e orientação a PS se indicado.',
      now() + interval '2 hours'
    )
    ON CONFLICT (symptom_log_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_symptom_logs_clinical_tasks ON public.symptom_logs;
CREATE TRIGGER trg_symptom_logs_clinical_tasks
AFTER INSERT ON public.symptom_logs
FOR EACH ROW
EXECUTE PROCEDURE public.trg_symptom_logs_create_clinical_tasks();

-- Seed educacional mínimo
INSERT INTO public.educational_content (slug, title, body, symptom_tags, cancer_types, sort_order)
VALUES
  (
    'nausea-quimio',
    'Náusea e quimioterapia',
    'Fracionar refeições, hidratar-se, evitar odores fortes. Comunique náusea persistente ou vómitos no diário — a equipa vê o alerta.',
    ARRAY['nausea']::text[],
    ARRAY[]::text[],
    1
  ),
  (
    'fadiga-oncologia',
    'Fadiga oncológica',
    'Planeie períodos de descanso, atividade leve conforme tolerância e durma regularmente. Fadiga intensa merece registo no diário.',
    ARRAY['fatigue']::text[],
    ARRAY[]::text[],
    2
  ),
  (
    'dor-gestao',
    'Gestão da dor',
    'Use a escala do diário com honestidade. Dor intensa ou súbita requer avaliação — o alerta vermelho notifica a equipa.',
    ARRAY['pain']::text[],
    ARRAY[]::text[],
    3
  ),
  (
    'mucosite-boca',
    'Cuidados com a boca (mucosite)',
    'Escova macia, soluções de bochecho recomendadas pela equipa, evitar alimentos ácidos ou crocantes. Registe dor ou sangramento.',
    ARRAY['sore_throat']::text[],
    ARRAY[]::text[],
    4
  ),
  (
    'imunoterapia-pele',
    'Pele e imunoterapia',
    'Alterações cutâneas novas devem ser fotografadas e comunicadas. Com o anexo no diário, a equipa vê a imagem no dossier.',
    ARRAY['dry_skin']::text[],
    ARRAY['breast', 'lung', 'other']::text[],
    5
  )
ON CONFLICT (slug) DO NOTHING;

-- Storage: anexos de sintomas
INSERT INTO storage.buckets (id, name, public)
VALUES ('symptom_attachments', 'symptom_attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "symptom_attachments_insert_own_patient"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'symptom_attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT p.id::text FROM public.patients p WHERE p.profile_id = (select auth.uid())
    UNION
    SELECT pc.patient_id::text FROM public.patient_caregivers pc
    WHERE pc.caregiver_profile_id = (select auth.uid())
  )
);

CREATE POLICY "symptom_attachments_select_staff_or_patient"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'symptom_attachments'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.patients p WHERE p.profile_id = (select auth.uid())
    )
    OR (storage.foldername(name))[1] IN (
      SELECT phl.patient_id::text
      FROM public.patient_hospital_links phl
      INNER JOIN public.staff_assignments sa ON sa.hospital_id = phl.hospital_id
      WHERE sa.staff_id = (select auth.uid()) AND phl.status = 'approved'
    )
    OR (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.patients p
      WHERE p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid()))
    )
  )
);
