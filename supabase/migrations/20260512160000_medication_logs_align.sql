-- Alinha medication_logs com a app (20260423120000) e o dashboard (colunas opcionais).
-- A segunda migração do wizard usou CREATE TABLE IF NOT EXISTS e não alterou a tabela já existente.

ALTER TABLE public.medication_logs
  ADD COLUMN IF NOT EXISTS quantity int NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'medication_logs_quantity_check'
  ) THEN
    ALTER TABLE public.medication_logs
      ADD CONSTRAINT medication_logs_quantity_check CHECK (quantity > 0);
  END IF;
END $$;

ALTER TABLE public.medication_logs
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.medication_logs
  ADD COLUMN IF NOT EXISTS taken_at timestamptz;

UPDATE public.medication_logs
SET taken_at = taken_time
WHERE taken_at IS NULL AND taken_time IS NOT NULL;

CREATE OR REPLACE FUNCTION public.medication_logs_sync_taken_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.taken_time IS NOT NULL THEN
    NEW.taken_at := COALESCE(NEW.taken_at, NEW.taken_time);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medication_logs_sync_taken_at ON public.medication_logs;
CREATE TRIGGER trg_medication_logs_sync_taken_at
BEFORE INSERT OR UPDATE OF taken_time, taken_at ON public.medication_logs
FOR EACH ROW
EXECUTE PROCEDURE public.medication_logs_sync_taken_at();

COMMENT ON COLUMN public.medication_logs.taken_at IS 'Espelho de taken_time para compatibilidade com queries (dashboard).';
