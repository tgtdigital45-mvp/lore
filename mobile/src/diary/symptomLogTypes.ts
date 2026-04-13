import type { SymptomDetailKey } from "@/src/diary/symptomCatalog";

export type { SymptomDetailKey };

/** Forma mínima de `symptom_logs` usada no diário e nos gráficos por sintoma. */
export type SymptomLogRow = {
  id: string;
  entry_kind: string;
  symptom_category: string | null;
  severity: string | null;
  pain_level: number | null;
  nausea_level: number | null;
  fatigue_level: number | null;
  mood: string | null;
  body_temperature: number | null;
  notes: string | null;
  logged_at: string;
  symptom_started_at?: string | null;
  symptom_ended_at?: string | null;
  triage_semaphore?: string | null;
  attachment_storage_path?: string | null;
  logged_by_profile_id?: string | null;
  ae_max_grade?: number | null;
  flow_context?: Record<string, unknown> | null;
};
