-- Mensagens recebidas (ex.: webhook Evolution API → onco-backend → Supabase).

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  body text,
  from_phone text,
  provider_external_id text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_patient_created
  ON public.whatsapp_inbound_messages (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_hospital_created
  ON public.whatsapp_inbound_messages (hospital_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_inbound_provider_id
  ON public.whatsapp_inbound_messages (provider_external_id)
  WHERE provider_external_id IS NOT NULL;

ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_inbound_staff_select" ON public.whatsapp_inbound_messages;

CREATE POLICY "whatsapp_inbound_staff_select"
ON public.whatsapp_inbound_messages
FOR SELECT
TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

COMMENT ON TABLE public.whatsapp_inbound_messages IS 'Mensagens WhatsApp recebidas (Evolution via webhook); inserts apenas com service role no backend.';
