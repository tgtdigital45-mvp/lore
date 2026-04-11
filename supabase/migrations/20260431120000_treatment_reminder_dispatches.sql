-- Desduplicação lembretes de sessões agendadas (Edge Function treatment-reminders)
CREATE TABLE IF NOT EXISTS public.treatment_reminder_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  infusion_id uuid NOT NULL REFERENCES public.treatment_infusions (id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('day_before', 'same_day')),
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (infusion_id, reminder_kind)
);

ALTER TABLE public.treatment_reminder_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treatment_reminder_dispatches_service"
ON public.treatment_reminder_dispatches FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.treatment_reminder_dispatches IS 'Preenchido por Edge Function treatment-reminders (service role); RLS nega client.';
