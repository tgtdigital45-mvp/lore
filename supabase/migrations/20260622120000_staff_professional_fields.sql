-- Campos opcionais para identificação profissional no painel (CRM/COREN, especialidade).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_license text,
  ADD COLUMN IF NOT EXISTS specialty text;

COMMENT ON COLUMN public.profiles.professional_license IS 'Registo profissional (CRM, COREN, etc.)';
COMMENT ON COLUMN public.profiles.specialty IS 'Especialidade ou cargo clínico declarado pelo utilizador';
