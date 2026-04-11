-- Paciente pode atualizar o próprio prontuário (ficha editável no app)
-- Preferências granulares de alertas (UI notificações)

CREATE POLICY "patients_update_own"
ON public.patients FOR UPDATE TO authenticated
USING (profile_id = (select auth.uid()))
WITH CHECK (profile_id = (select auth.uid()));

COMMENT ON POLICY "patients_update_own" ON public.patients IS 'Paciente edita tipo de câncer, estágio, nadir no app.';

ALTER TABLE public.patient_consents
  ADD COLUMN IF NOT EXISTS notify_medications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_appointments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_symptoms boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.patient_consents.notify_medications IS 'Alertas de medicamentos (local + servidor quando aplicável).';
COMMENT ON COLUMN public.patient_consents.notify_appointments IS 'Alertas de consultas/exames no calendário.';
COMMENT ON COLUMN public.patient_consents.notify_symptoms IS 'Lembretes do diário de sintomas.';
