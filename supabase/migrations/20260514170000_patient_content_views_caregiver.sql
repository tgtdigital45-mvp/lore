-- Cuidador pode registar leitura de artigos em nome do paciente.

CREATE POLICY "patient_content_views_caregiver"
ON public.patient_content_views FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patient_caregivers pc
    WHERE pc.patient_id = patient_content_views.patient_id AND pc.caregiver_profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patient_caregivers pc
    WHERE pc.patient_id = patient_content_views.patient_id AND pc.caregiver_profile_id = (select auth.uid())
  )
);
