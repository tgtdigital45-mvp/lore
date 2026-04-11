-- Sprint 6: integrações por hospital (URLs/documentação); staff pode anexar exames ao prontuário.

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS integration_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.hospitals.integration_settings IS
  'JSON opcional: whatsapp.public_backend_url (texto), whatsapp.operator_notes. Sem segredos Meta.';

-- Anexos de exame pela equipa (mesmo fluxo OCR que o paciente)
CREATE POLICY "Hospital staff insert medical documents"
ON public.medical_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = medical_documents.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
);

CREATE POLICY "Hospital staff insert biomarker logs"
ON public.biomarker_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
);
