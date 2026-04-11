-- Sprint 4: mensagens WhatsApp enviadas pela equipe (histórico + status Meta).

ALTER TYPE public.audit_action_type ADD VALUE IF NOT EXISTS 'WHATSAPP_OUTBOUND';

CREATE TABLE IF NOT EXISTS public.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  body text,
  template_name text,
  provider_message_id text,
  status text NOT NULL DEFAULT 'pending',
  error_detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbound_messages_status_chk CHECK (
    status IN ('pending', 'sent', 'delivered', 'read', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_patient_created
  ON public.outbound_messages (patient_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_messages_provider_id
  ON public.outbound_messages (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff read outbound messages"
ON public.outbound_messages FOR SELECT
TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

COMMENT ON TABLE public.outbound_messages IS 'Envios institucionais (WhatsApp Cloud API); inserts pelo backend com service role.';
