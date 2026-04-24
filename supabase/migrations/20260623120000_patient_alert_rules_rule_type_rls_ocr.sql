-- 1) patient_alert_rules.rule_type: versiona no repositório o que alguns remotes
--    têm com CHECK incompatível com o valor "patient" enviado pelo dashboard.
-- 2) medical_documents / biomarker_logs INSERT: alinhar RLS com handleStaffOcrForPatient
--    (lotação por hospital) além de patient e staff_has_readwrite_patient_link.

-- --- rule_type ---
ALTER TABLE public.patient_alert_rules
  ADD COLUMN IF NOT EXISTS rule_type text;

-- Remover CHECK remoto/antigo antes de corrigir valores (evita 23514 no próprio migration).
ALTER TABLE public.patient_alert_rules
  DROP CONSTRAINT IF EXISTS patient_alert_rules_rule_type_check;

UPDATE public.patient_alert_rules
SET rule_type = 'patient'
WHERE rule_type IS NULL OR btrim(rule_type) = '';

UPDATE public.patient_alert_rules
SET rule_type = 'patient'
WHERE rule_type IS NOT NULL
  AND rule_type NOT IN ('patient', 'hospital_template');

ALTER TABLE public.patient_alert_rules
  ALTER COLUMN rule_type SET DEFAULT 'patient';

ALTER TABLE public.patient_alert_rules
  ALTER COLUMN rule_type SET NOT NULL;

ALTER TABLE public.patient_alert_rules
  ADD CONSTRAINT patient_alert_rules_rule_type_check
  CHECK (rule_type = ANY (ARRAY['patient', 'hospital_template']::text[]));

COMMENT ON COLUMN public.patient_alert_rules.rule_type IS
  'Origem da regra: patient (dossiê) ou hospital_template (futuro).';

-- --- RLS: staff com staff_assignments no hospital do paciente (Sprint6 + 2026042212) ---

DROP POLICY IF EXISTS "medical_documents_insert_consolidated" ON public.medical_documents;

CREATE POLICY "medical_documents_insert_consolidated"
ON public.medical_documents FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "biomarker_logs_insert_consolidated" ON public.biomarker_logs;

CREATE POLICY "biomarker_logs_insert_consolidated"
ON public.biomarker_logs FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id AND p.profile_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND public.staff_has_readwrite_patient_link(p.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

NOTIFY pgrst, 'reload schema';
