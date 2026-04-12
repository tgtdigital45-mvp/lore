-- Unidade de infusão: cadeiras/macas cadastráveis, agenda por recurso e reservas com duração e medicação.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.infusion_resource_kind AS ENUM ('chair', 'stretcher');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.infusion_resource_operational_status AS ENUM ('active', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- infusion_resources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.infusion_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  kind public.infusion_resource_kind NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  operational_status public.infusion_resource_operational_status NOT NULL DEFAULT 'active',
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infusion_resources_label_nonempty CHECK (length(trim(label)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_infusion_resources_hospital_kind
  ON public.infusion_resources (hospital_id, kind, sort_order);

COMMENT ON TABLE public.infusion_resources IS 'Cadeiras e macas da unidade de infusão; manutenção bloqueia novos agendamentos.';
COMMENT ON COLUMN public.infusion_resources.details IS 'Observações (ex.: lote de capa, equipamento).';

-- ---------------------------------------------------------------------------
-- infusion_resource_bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.infusion_resource_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals (id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.infusion_resources (id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients (id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  medication_notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT infusion_booking_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_infusion_bookings_resource_starts
  ON public.infusion_resource_bookings (resource_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_infusion_bookings_hospital_starts
  ON public.infusion_resource_bookings (hospital_id, starts_at);

COMMENT ON TABLE public.infusion_resource_bookings IS 'Reservas de janela na cadeira/maca; medicação prevista em texto livre.';

-- ---------------------------------------------------------------------------
-- Triggers: overlap, hospital_id, updated_at, created_by
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.infusion_booking_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.infusion_resource_bookings b
    WHERE b.resource_id = NEW.resource_id
      AND b.id IS DISTINCT FROM NEW.id
      AND b.starts_at < NEW.ends_at
      AND b.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Já existe reserva sobreposta neste recurso no horário indicado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_infusion_booking_no_overlap ON public.infusion_resource_bookings;
CREATE TRIGGER trg_infusion_booking_no_overlap
BEFORE INSERT OR UPDATE OF resource_id, starts_at, ends_at ON public.infusion_resource_bookings
FOR EACH ROW
EXECUTE PROCEDURE public.infusion_booking_no_overlap();

CREATE OR REPLACE FUNCTION public.infusion_booking_set_hospital()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  hid uuid;
BEGIN
  SELECT r.hospital_id INTO hid FROM public.infusion_resources r WHERE r.id = NEW.resource_id;
  IF hid IS NULL THEN
    RAISE EXCEPTION 'Recurso de infusão inválido.';
  END IF;
  NEW.hospital_id := hid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_infusion_booking_set_hospital ON public.infusion_resource_bookings;
CREATE TRIGGER trg_infusion_booking_set_hospital
BEFORE INSERT OR UPDATE OF resource_id ON public.infusion_resource_bookings
FOR EACH ROW
EXECUTE PROCEDURE public.infusion_booking_set_hospital();

CREATE OR REPLACE FUNCTION public.infusion_booking_set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_infusion_booking_set_created_by ON public.infusion_resource_bookings;
CREATE TRIGGER trg_infusion_booking_set_created_by
BEFORE INSERT ON public.infusion_resource_bookings
FOR EACH ROW
EXECUTE PROCEDURE public.infusion_booking_set_created_by();

CREATE OR REPLACE FUNCTION public.touch_infusion_resource_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_infusion_resources_touch ON public.infusion_resources;
CREATE TRIGGER trg_infusion_resources_touch
BEFORE UPDATE ON public.infusion_resources
FOR EACH ROW
EXECUTE PROCEDURE public.touch_infusion_resource_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.infusion_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infusion_resource_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff select infusion resources"
ON public.infusion_resources FOR SELECT TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

CREATE POLICY "Staff insert infusion resources"
ON public.infusion_resources FOR INSERT TO authenticated
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

CREATE POLICY "Staff update infusion resources"
ON public.infusion_resources FOR UPDATE TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
)
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

CREATE POLICY "Staff delete infusion resources"
ON public.infusion_resources FOR DELETE TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

CREATE POLICY "Staff select infusion bookings"
ON public.infusion_resource_bookings FOR SELECT TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

CREATE POLICY "Staff insert infusion bookings"
ON public.infusion_resource_bookings FOR INSERT TO authenticated
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  AND (patient_id IS NULL OR public.staff_has_approved_patient_link(patient_id))
);

CREATE POLICY "Staff update infusion bookings"
ON public.infusion_resource_bookings FOR UPDATE TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
)
WITH CHECK (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
  AND (patient_id IS NULL OR public.staff_has_approved_patient_link(patient_id))
);

CREATE POLICY "Staff delete infusion bookings"
ON public.infusion_resource_bookings FOR DELETE TO authenticated
USING (
  hospital_id IN (SELECT sa.hospital_id FROM public.staff_assignments sa WHERE sa.staff_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- Realtime (dashboard agenda)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.infusion_resources;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.infusion_resource_bookings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Seed demo hospital (id fixo do demo Aura) — só se ainda não houver recursos
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  demo uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.infusion_resources WHERE hospital_id = demo) THEN
    INSERT INTO public.infusion_resources (hospital_id, kind, label, sort_order, operational_status, details)
    SELECT demo, 'chair'::public.infusion_resource_kind,
           'Cadeira ' || g.n, g.n, 'active'::public.infusion_resource_operational_status,
           'Cadastro demo · capa padrão'
    FROM generate_series(1, 6) AS g(n);

    INSERT INTO public.infusion_resources (hospital_id, kind, label, sort_order, operational_status, details)
    SELECT demo, 'stretcher'::public.infusion_resource_kind,
           'Maca ' || g.n, 100 + g.n, 'active'::public.infusion_resource_operational_status,
           'Cadastro demo'
    FROM generate_series(1, 2) AS g(n);
  END IF;
END $$;
