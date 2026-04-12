-- Permite à equipa do hospital (vínculo aprovado) ler contactos de emergência, como nas restantes tabelas clínicas.

DROP POLICY IF EXISTS "patient_emergency_contacts_select" ON public.patient_emergency_contacts;

CREATE POLICY "patient_emergency_contacts_select"
ON public.patient_emergency_contacts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_emergency_contacts.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR public.staff_has_approved_patient_link(p.id)
      )
  )
);
