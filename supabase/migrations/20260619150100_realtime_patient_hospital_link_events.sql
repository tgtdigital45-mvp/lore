-- Idempotente: só corre se a tabela já existir (ex.: migração 20260619140000 aplicada antes deste ficheiro).
-- Instalações novas já recebem realtime no final de 20260619140000.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'patient_hospital_link_events'
      AND c.relkind = 'r'
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'patient_hospital_link_events'
  ) THEN
    RETURN;
  END IF;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_hospital_link_events;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
