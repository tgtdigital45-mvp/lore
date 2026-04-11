-- Ficha médica: antecedentes, medidas, gravidez, notas; contatos de emergência; avatar no perfil.

-- ---------------------------------------------------------------------------
-- Perfis: URL pública da foto (bucket avatars)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.profiles.avatar_url IS 'URL pública do avatar (storage bucket avatars).';

-- ---------------------------------------------------------------------------
-- Pacientes: campos clínicos adicionais (editáveis pelo dono via patients_update_own)
-- ---------------------------------------------------------------------------
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS is_pregnant boolean,
  ADD COLUMN IF NOT EXISTS uses_continuous_medication boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS continuous_medication_notes text,
  ADD COLUMN IF NOT EXISTS medical_history text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS height_cm numeric(5, 2),
  ADD COLUMN IF NOT EXISTS weight_kg numeric(6, 2),
  ADD COLUMN IF NOT EXISTS clinical_notes text;

COMMENT ON COLUMN public.patients.is_pregnant IS 'NULL = não informado; uso clínico sujeito a LGPD.';
COMMENT ON COLUMN public.patients.uses_continuous_medication IS 'Uso contínuo de medicamentos (ex.: crónico).';
COMMENT ON COLUMN public.patients.continuous_medication_notes IS 'Detalhe livre do uso contínuo de medicamentos.';
COMMENT ON COLUMN public.patients.medical_history IS 'Doenças e condições médicas anteriores (texto livre).';
COMMENT ON COLUMN public.patients.allergies IS 'Alergias conhecidas (texto livre).';
COMMENT ON COLUMN public.patients.height_cm IS 'Altura de referência na ficha (cm).';
COMMENT ON COLUMN public.patients.weight_kg IS 'Peso de referência na ficha (kg); distinto de registos vitais.';
COMMENT ON COLUMN public.patients.clinical_notes IS 'Notas clínicas livres na ficha.';

-- ---------------------------------------------------------------------------
-- Contatos de emergência
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  relationship text,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_emergency_contacts_patient_sort
  ON public.patient_emergency_contacts (patient_id, sort_order, created_at);

ALTER TABLE public.patient_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_emergency_contacts_select"
ON public.patient_emergency_contacts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_emergency_contacts.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

CREATE POLICY "patient_emergency_contacts_mutate_patient"
ON public.patient_emergency_contacts FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_emergency_contacts.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_emergency_contacts.patient_id AND p.profile_id = (select auth.uid())
  )
);

COMMENT ON TABLE public.patient_emergency_contacts IS 'Contactos de emergência do paciente; edição só pelo titular do perfil.';

-- ---------------------------------------------------------------------------
-- Storage: avatars (público para leitura por URL; escrita só do dono)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE POLICY "storage_avatars_select_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND owner = (select auth.uid()));

CREATE POLICY "storage_avatars_select_public"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'avatars');

CREATE POLICY "storage_avatars_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND owner = (select auth.uid()));

CREATE POLICY "storage_avatars_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND owner = (select auth.uid()));

CREATE POLICY "storage_avatars_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND owner = (select auth.uid()));
