-- Campos opcionais para resumo de quimioterapia no hospital dashboard (sessão, peso, progresso).

ALTER TABLE public.treatment_cycles
  ADD COLUMN IF NOT EXISTS planned_sessions int CHECK (planned_sessions IS NULL OR planned_sessions >= 0),
  ADD COLUMN IF NOT EXISTS completed_sessions int CHECK (completed_sessions IS NULL OR completed_sessions >= 0),
  ADD COLUMN IF NOT EXISTS last_session_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_weight_kg numeric(8, 2) CHECK (last_weight_kg IS NULL OR (last_weight_kg > 0 AND last_weight_kg < 500));

COMMENT ON COLUMN public.treatment_cycles.planned_sessions IS 'Sessões planejadas no protocolo (opcional; preenchido pela equipe ou integração).';
COMMENT ON COLUMN public.treatment_cycles.completed_sessions IS 'Sessões já realizadas (opcional).';
COMMENT ON COLUMN public.treatment_cycles.last_session_at IS 'Data/hora da última infusão/sessão registada.';
COMMENT ON COLUMN public.treatment_cycles.last_weight_kg IS 'Peso (kg) associado à última sessão, se registado.';
