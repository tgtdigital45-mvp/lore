-- Permite que usuários autenticados com perfil médico/enfermeiro se vinculem ao hospital demo (MVP / onboarding do dashboard).
-- Produção: remova ou restrinja esta política e use provisionamento pela TI.

CREATE POLICY "Staff insert own assignment demo hospital"
ON public.staff_assignments FOR INSERT
TO authenticated
WITH CHECK (
  staff_id = auth.uid()
  AND hospital_id = '00000000-0000-0000-0000-000000000001'
  AND EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role IN ('doctor', 'nurse')
  )
);
