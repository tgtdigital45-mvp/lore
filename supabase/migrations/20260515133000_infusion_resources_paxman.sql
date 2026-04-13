-- Macas: equipamento de crioterapia escalp (touca inglesa PAXMAN) disponível durante a infusão.

ALTER TABLE public.infusion_resources
  ADD COLUMN IF NOT EXISTS paxman_cryotherapy boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.infusion_resources.paxman_cryotherapy IS
  'Posição (cadeira ou maca) com touca inglesa PAXMAN para crioterapia durante a infusão (scalp cooling).';
