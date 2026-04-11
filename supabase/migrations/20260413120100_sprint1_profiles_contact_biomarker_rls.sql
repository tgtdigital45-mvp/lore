-- Sprint 1 (parte 2/2): colunas de contato, RLS biomarcadores, policy demo staff.
-- PRÉ-REQUISITO: migration 20260413120000 aplicada (enum hospital_admin).
-- Erro 22P02 "invalid input value for enum user_role: hospital_admin" = parte 1 não rodou; execute só o arquivo 20260413120000 e depois este.

-- Contato e consentimento LGPD para canal WhatsApp (paciente)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_revoked_at timestamptz;

COMMENT ON COLUMN public.profiles.phone_e164 IS 'Telefone E.164 para WhatsApp; preenchido pelo app ou equipe autorizada.';
COMMENT ON COLUMN public.profiles.whatsapp_opt_in_at IS 'Consentimento para mensagens institucionais via WhatsApp.';
COMMENT ON COLUMN public.profiles.whatsapp_opt_in_revoked_at IS 'Revogação do opt-in WhatsApp.';

-- Staff do hospital lê biomarcadores dos pacientes da mesma lotação
DROP POLICY IF EXISTS "Hospital staff read biomarker logs" ON public.biomarker_logs;
CREATE POLICY "Hospital staff read biomarker logs"
ON public.biomarker_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = biomarker_logs.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid()
      )
  )
);

-- Demo: gestor hospital_admin também pode inserir própria lotação no hospital demo
DROP POLICY IF EXISTS "Staff insert own assignment demo hospital" ON public.staff_assignments;
CREATE POLICY "Staff insert own assignment demo hospital"
ON public.staff_assignments FOR INSERT
TO authenticated
WITH CHECK (
  staff_id = auth.uid()
  AND hospital_id = '00000000-0000-0000-0000-000000000001'
  AND EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role IN ('doctor', 'nurse', 'hospital_admin')
  )
);
