-- Logradouro detalhado (rua, número, bairro, complemento) em patients — app + dossiê hospitalar
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_complement text;

COMMENT ON COLUMN public.patients.address_street IS 'Logradouro (rua/avenida)';
COMMENT ON COLUMN public.patients.address_number IS 'Número';
COMMENT ON COLUMN public.patients.address_neighborhood IS 'Bairro';
COMMENT ON COLUMN public.patients.address_complement IS 'Complemento (apto, bloco, etc.)';
