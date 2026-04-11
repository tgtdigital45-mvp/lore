-- Intervalo em dias entre infusões (protocolo), para sugerir a próxima data.

ALTER TABLE public.treatment_cycles
  ADD COLUMN IF NOT EXISTS infusion_interval_days int
    CHECK (infusion_interval_days IS NULL OR (infusion_interval_days >= 1 AND infusion_interval_days <= 180));

COMMENT ON COLUMN public.treatment_cycles.infusion_interval_days IS 'Dias entre infusões recomendados no protocolo (ex.: 7, 14, 21); usado para estimar a próxima sessão.';
