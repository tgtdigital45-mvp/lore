-- Tipos de tratamento, observações no ciclo, infusões por linha, agregados via trigger, RLS paciente+staff.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.treatment_kind AS ENUM (
    'chemotherapy',
    'radiotherapy',
    'hormone',
    'immunotherapy',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.infusion_session_status AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.treatment_cycles
  ADD COLUMN IF NOT EXISTS treatment_kind public.treatment_kind NOT NULL DEFAULT 'chemotherapy';

ALTER TABLE public.treatment_cycles
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.treatment_cycles.treatment_kind IS 'Modalidade do protocolo (quimio, radio, hormônio, imuno, outro).';
COMMENT ON COLUMN public.treatment_cycles.notes IS 'Observações livres do ciclo/protocolo.';

-- ---------------------------------------------------------------------------
-- treatment_infusions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_infusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients (id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.treatment_cycles (id) ON DELETE CASCADE,
  session_at timestamptz NOT NULL,
  status public.infusion_session_status NOT NULL DEFAULT 'completed',
  weight_kg numeric(8, 2) CHECK (weight_kg IS NULL OR (weight_kg > 0 AND weight_kg < 500)),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.treatment_infusions IS 'Sessões/infusões ou agendamentos; reagendar = UPDATE session_at em status scheduled.';
COMMENT ON COLUMN public.treatment_infusions.session_at IS 'Data/hora realizada (completed) ou planejada (scheduled).';

CREATE INDEX IF NOT EXISTS idx_treatment_infusions_cycle_id ON public.treatment_infusions (cycle_id);
CREATE INDEX IF NOT EXISTS idx_treatment_infusions_patient_id ON public.treatment_infusions (patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_infusions_session_at ON public.treatment_infusions (session_at);

-- updated_at touch
CREATE OR REPLACE FUNCTION public.touch_treatment_infusions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_treatment_infusions_updated_at ON public.treatment_infusions;
CREATE TRIGGER tr_treatment_infusions_updated_at
  BEFORE UPDATE ON public.treatment_infusions
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_treatment_infusions_updated_at();

-- Agregados no ciclo pai: última sessão e peso a partir de infusões completed (completed_sessions permanece editável no ciclo)
CREATE OR REPLACE FUNCTION public._apply_cycle_aggregates(p_cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_at timestamptz;
  last_w numeric(8, 2);
BEGIN
  SELECT max(ti.session_at)
  INTO last_at
  FROM public.treatment_infusions ti
  WHERE ti.cycle_id = p_cycle_id AND ti.status = 'completed';

  SELECT ti.weight_kg
  INTO last_w
  FROM public.treatment_infusions ti
  WHERE ti.cycle_id = p_cycle_id AND ti.status = 'completed'
  ORDER BY ti.session_at DESC NULLS LAST
  LIMIT 1;

  UPDATE public.treatment_cycles tc
  SET
    last_session_at = last_at,
    last_weight_kg = last_w
  WHERE tc.id = p_cycle_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_treatment_cycle_infusion_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    cid := OLD.cycle_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.cycle_id IS DISTINCT FROM NEW.cycle_id THEN
    PERFORM public._apply_cycle_aggregates(OLD.cycle_id);
    PERFORM public._apply_cycle_aggregates(NEW.cycle_id);
    RETURN NEW;
  ELSE
    cid := NEW.cycle_id;
  END IF;

  PERFORM public._apply_cycle_aggregates(cid);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_treatment_infusions_aggregates ON public.treatment_infusions;
CREATE TRIGGER tr_treatment_infusions_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON public.treatment_infusions
  FOR EACH ROW
  EXECUTE PROCEDURE public.refresh_treatment_cycle_infusion_aggregates();

-- ---------------------------------------------------------------------------
-- RLS treatment_infusions
-- ---------------------------------------------------------------------------
ALTER TABLE public.treatment_infusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatment_infusions_select_consolidated" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_select_consolidated"
ON public.treatment_infusions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND (
        p.profile_id = (select auth.uid())
        OR p.hospital_id IN (
          SELECT sa.hospital_id FROM public.staff_assignments sa
          WHERE sa.staff_id = (select auth.uid())
        )
      )
  )
);

DROP POLICY IF EXISTS "treatment_infusions_staff_insert" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_staff_insert"
ON public.treatment_infusions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

DROP POLICY IF EXISTS "treatment_infusions_staff_update" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_staff_update"
ON public.treatment_infusions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

DROP POLICY IF EXISTS "treatment_infusions_staff_delete" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_staff_delete"
ON public.treatment_infusions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id
      AND p.hospital_id IN (
        SELECT sa.hospital_id FROM public.staff_assignments sa
        WHERE sa.staff_id = (select auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "treatment_infusions_insert_patient" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_insert_patient"
ON public.treatment_infusions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

DROP POLICY IF EXISTS "treatment_infusions_update_patient" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_update_patient"
ON public.treatment_infusions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.treatment_cycles tc
    WHERE tc.id = treatment_infusions.cycle_id AND tc.patient_id = treatment_infusions.patient_id
  )
);

DROP POLICY IF EXISTS "treatment_infusions_delete_patient" ON public.treatment_infusions;
CREATE POLICY "treatment_infusions_delete_patient"
ON public.treatment_infusions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_infusions.patient_id AND p.profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Paciente: INSERT/UPDATE/DELETE em treatment_cycles (além do staff existente)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "treatment_cycles_insert_patient" ON public.treatment_cycles;
CREATE POLICY "treatment_cycles_insert_patient"
ON public.treatment_cycles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "treatment_cycles_update_patient" ON public.treatment_cycles;
CREATE POLICY "treatment_cycles_update_patient"
ON public.treatment_cycles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "treatment_cycles_delete_patient" ON public.treatment_cycles;
CREATE POLICY "treatment_cycles_delete_patient"
ON public.treatment_cycles FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = treatment_cycles.patient_id AND p.profile_id = (select auth.uid())
  )
);
