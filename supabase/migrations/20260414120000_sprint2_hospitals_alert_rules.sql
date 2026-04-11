-- Sprint 2: regras de alerta por hospital (limiar de febre, janela de triagem em horas).
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS alert_rules jsonb NOT NULL DEFAULT '{"fever_celsius_min":38,"alert_window_hours":72}'::jsonb;

COMMENT ON COLUMN public.hospitals.alert_rules IS
  'JSON: fever_celsius_min (numeric), alert_window_hours (int). Usado pelo dashboard para badges e filtros.';
