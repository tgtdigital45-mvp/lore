-- Catálogo data-driven: tipos de câncer, protocolos, pivô N:N e diretrizes de monitoramento.
-- Mantém patients.primary_cancer_type (enum legado) e treatment_cycles.protocol_name; adiciona FKs opcionais.

-- ---------------------------------------------------------------------------
-- Enums (contrato alinhado ao TypeScript)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.guideline_category AS ENUM (
    'symptom', 'exam', 'dietary_restriction', 'medication'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.severity_level AS ENUM (
    'low', 'medium', 'high', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cancer_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stage text,
  sort_order int NOT NULL DEFAULT 0,
  legacy_cancer_type public.cancer_type UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_weeks int NOT NULL CHECK (duration_weeks >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cancer_protocols (
  cancer_type_id uuid NOT NULL REFERENCES public.cancer_types (id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES public.protocols (id) ON DELETE CASCADE,
  PRIMARY KEY (cancer_type_id, protocol_id)
);

CREATE TABLE IF NOT EXISTS public.monitoring_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid NOT NULL REFERENCES public.protocols (id) ON DELETE CASCADE,
  category public.guideline_category NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity_level public.severity_level NOT NULL,
  action_required text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FKs opcionais no modelo existente
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS cancer_type_id uuid REFERENCES public.cancer_types (id) ON DELETE SET NULL;

ALTER TABLE public.treatment_cycles
  ADD COLUMN IF NOT EXISTS protocol_id uuid REFERENCES public.protocols (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_monitoring_guidelines_protocol_id ON public.monitoring_guidelines (protocol_id);
CREATE INDEX IF NOT EXISTS idx_cancer_protocols_protocol_id ON public.cancer_protocols (protocol_id);
CREATE INDEX IF NOT EXISTS idx_patients_cancer_type_id ON public.patients (cancer_type_id);
CREATE INDEX IF NOT EXISTS idx_treatment_cycles_protocol_id ON public.treatment_cycles (protocol_id);

COMMENT ON TABLE public.cancer_types IS 'Catálogo de tipos de câncer; legacy_cancer_type mapeia o enum patients.primary_cancer_type.';
COMMENT ON TABLE public.protocols IS 'Protocolos de tratamento (ex.: AC-T, FOLFOX).';
COMMENT ON TABLE public.cancer_protocols IS 'Associação N:N entre tipos de câncer e protocolos.';
COMMENT ON TABLE public.monitoring_guidelines IS 'Diretrizes de monitoramento por protocolo (sintomas, exames, etc.).';
COMMENT ON COLUMN public.patients.cancer_type_id IS 'Opcional; quando preenchido, referencia o catálogo além do enum legado.';
COMMENT ON COLUMN public.treatment_cycles.protocol_id IS 'Opcional; quando preenchido, referencia o catálogo; protocol_name permanece para compatibilidade.';

-- ---------------------------------------------------------------------------
-- Seed: cancer_types + um protocolo de exemplo + diretrizes mínimas
-- ---------------------------------------------------------------------------
INSERT INTO public.cancer_types (name, sort_order, legacy_cancer_type)
VALUES
  ('Câncer de mama', 10, 'breast'),
  ('Câncer de pulmão', 20, 'lung'),
  ('Câncer de próstata', 30, 'prostate'),
  ('Leucemia', 40, 'leukemia'),
  ('Câncer colorretal', 50, 'colorectal'),
  ('Outro / não especificado', 90, 'other')
ON CONFLICT (legacy_cancer_type) DO NOTHING;

UPDATE public.patients p
SET cancer_type_id = ct.id
FROM public.cancer_types ct
WHERE p.cancer_type_id IS NULL
  AND ct.legacy_cancer_type IS NOT NULL
  AND ct.legacy_cancer_type = p.primary_cancer_type;

INSERT INTO public.protocols (id, name, duration_weeks)
VALUES (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'Protocolo de exemplo (catálogo)',
  12
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cancer_protocols (cancer_type_id, protocol_id)
SELECT ct.id, 'a0000000-0000-4000-8000-000000000001'::uuid
FROM public.cancer_types ct
ON CONFLICT DO NOTHING;

INSERT INTO public.monitoring_guidelines (protocol_id, category, title, description, severity_level, action_required, sort_order)
SELECT 'a0000000-0000-4000-8000-000000000001'::uuid,
  'symptom'::public.guideline_category,
  'Febre ou calafrios',
  'Monitorar temperatura corporal.',
  'critical'::public.severity_level,
  'Procurar o pronto-socorro se febre ≥ 38°C ou calafrios intensos.',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.monitoring_guidelines mg
  WHERE mg.protocol_id = 'a0000000-0000-4000-8000-000000000001'::uuid AND mg.title = 'Febre ou calafrios'
);

INSERT INTO public.monitoring_guidelines (protocol_id, category, title, description, severity_level, action_required, sort_order)
SELECT 'a0000000-0000-4000-8000-000000000001'::uuid,
  'exam'::public.guideline_category,
  'Hemograma completo',
  'Controle de células sanguíneas durante o tratamento.',
  'medium'::public.severity_level,
  'Realizar conforme orientação da equipe; trazer resultado na próxima consulta.',
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.monitoring_guidelines mg
  WHERE mg.protocol_id = 'a0000000-0000-4000-8000-000000000001'::uuid AND mg.title = 'Hemograma completo'
);

-- ---------------------------------------------------------------------------
-- RLS: leitura para qualquer authenticated; escrita apenas hospital_admin com lotação
-- ---------------------------------------------------------------------------
ALTER TABLE public.cancer_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancer_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cancer_types_select_authenticated"
ON public.cancer_types FOR SELECT TO authenticated
USING (true);

CREATE POLICY "protocols_select_authenticated"
ON public.protocols FOR SELECT TO authenticated
USING (true);

CREATE POLICY "cancer_protocols_select_authenticated"
ON public.cancer_protocols FOR SELECT TO authenticated
USING (true);

CREATE POLICY "monitoring_guidelines_select_authenticated"
ON public.monitoring_guidelines FOR SELECT TO authenticated
USING (true);

CREATE POLICY "cancer_types_mutate_hospital_admin"
ON public.cancer_types FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

CREATE POLICY "protocols_mutate_hospital_admin"
ON public.protocols FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

CREATE POLICY "cancer_protocols_mutate_hospital_admin"
ON public.cancer_protocols FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);

CREATE POLICY "monitoring_guidelines_mutate_hospital_admin"
ON public.monitoring_guidelines FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.staff_assignments sa ON sa.staff_id = pr.id
    WHERE pr.id = (select auth.uid())
      AND pr.role = 'hospital_admin'::public.user_role
  )
);
