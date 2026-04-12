-- Escala verbal: não presente / presente + suave / moderado / grave (enum existente).
-- Janela temporal opcional por registo legado.

ALTER TYPE public.symptom_severity ADD VALUE IF NOT EXISTS 'absent';
ALTER TYPE public.symptom_severity ADD VALUE IF NOT EXISTS 'present';

ALTER TABLE public.symptom_logs
  ADD COLUMN IF NOT EXISTS symptom_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS symptom_ended_at timestamptz;

COMMENT ON COLUMN public.symptom_logs.symptom_started_at IS 'Início do episódio (registos legados por sintoma).';
COMMENT ON COLUMN public.symptom_logs.symptom_ended_at IS 'Fim do episódio (registos legados por sintoma).';
