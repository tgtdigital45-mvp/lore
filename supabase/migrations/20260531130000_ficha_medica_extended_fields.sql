-- Extended demográficos / administrativos para ficha médica (staff dashboard + app)
-- patients: sexo, tipo sanguíneo, documento, profissão, convênio, localização
-- profiles: e-mail de contacto (além de auth.users.email)

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS sex text,
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS insurance_plan text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text;

DO $$
BEGIN
  ALTER TABLE public.patients
    ADD CONSTRAINT patients_sex_check CHECK (sex IS NULL OR sex IN ('M', 'F', 'I', 'O'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.patients
    ADD CONSTRAINT patients_blood_type_check CHECK (
      blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'ND')
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_display text;

COMMENT ON COLUMN public.patients.sex IS 'M/F/I/O — sexo biológico ou equivalente (I=intersexo, O=outro)';
COMMENT ON COLUMN public.patients.blood_type IS 'Tipo sanguíneo; ND = não determinado';
COMMENT ON COLUMN public.profiles.email_display IS 'E-mail de contacto clínico/comunicação; pode diferir do e-mail de login';
