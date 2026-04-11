-- Amostras Apple Health / HealthKit (e futuras fontes): vitais + quedas + eventos de estabilidade.
-- Idempotência por UUID do HealthKit por paciente.

CREATE TABLE IF NOT EXISTS public.health_wearable_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'apple_health',
  metric text NOT NULL CHECK (
    metric IN (
      'heart_rate',
      'oxygen_saturation',
      'hrv_sdnn',
      'falls_count',
      'walking_steadiness_event'
    )
  ),
  value_numeric double precision,
  unit text,
  observed_start timestamptz NOT NULL,
  observed_end timestamptz,
  apple_sample_uuid text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, apple_sample_uuid)
);

CREATE INDEX IF NOT EXISTS idx_health_wearable_patient_metric_observed
  ON public.health_wearable_samples (patient_id, metric, observed_start DESC);

CREATE INDEX IF NOT EXISTS idx_health_wearable_patient_observed
  ON public.health_wearable_samples (patient_id, observed_start DESC);

CREATE OR REPLACE FUNCTION public.touch_health_wearable_samples_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_health_wearable_samples_updated_at ON public.health_wearable_samples;
CREATE TRIGGER trg_health_wearable_samples_updated_at
BEFORE UPDATE ON public.health_wearable_samples
FOR EACH ROW
EXECUTE PROCEDURE public.touch_health_wearable_samples_updated_at();

ALTER TABLE public.health_wearable_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients read own wearable samples"
ON public.health_wearable_samples FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Patients insert own wearable samples"
ON public.health_wearable_samples FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Patients update own wearable samples"
ON public.health_wearable_samples FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id AND p.profile_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id AND p.profile_id = auth.uid()
  )
);

CREATE POLICY "Hospital staff read wearable samples for hospital patients"
ON public.health_wearable_samples FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = health_wearable_samples.patient_id
      AND p.hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  )
);
