-- Add metadata column to vital_logs for linking to symptoms and other events
ALTER TABLE public.vital_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Policy update for metadata (already handled by consolidated policies if they don't specify columns)
-- but we should ensure the comment reflects this.
COMMENT ON COLUMN public.vital_logs.metadata IS 'JSON metadata for linking logs to other events (e.g., symptom_log_id).';
