-- Uma linha por (medicamento, instante agendado); estado no_interaction para janelas sem interação.

-- 1) Remover duplicados: manter uma linha por (medication_id, scheduled_time), priorizando 'taken'.
DELETE FROM public.medication_logs
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY medication_id, scheduled_time
        ORDER BY
          CASE status
            WHEN 'taken' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'skipped' THEN 3
            ELSE 4
          END,
          COALESCE(taken_time, scheduled_time) DESC NULLS LAST
      ) AS rn
    FROM public.medication_logs
  ) sub
  WHERE rn > 1
);

-- 2) Alargar valores de status (nome canónico no_interaction; UI: "Sem interação")
ALTER TABLE public.medication_logs DROP CONSTRAINT IF EXISTS medication_logs_status_check;
ALTER TABLE public.medication_logs
  ADD CONSTRAINT medication_logs_status_check
  CHECK (status IN ('taken', 'skipped', 'pending', 'no_interaction'));

CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_med_sched_unique
  ON public.medication_logs (medication_id, scheduled_time);

COMMENT ON INDEX medication_logs_med_sched_unique IS 'Uma entrada por janela agendada; evita duplicados de tomas.';
