/**
 * Contrato alinhado às tabelas public.protocols e public.monitoring_guidelines (Supabase).
 */

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export type GuidelineCategory = "symptom" | "exam" | "dietary_restriction" | "medication";

export interface MonitoringGuideline {
  id: string;
  protocol_id: string;
  category: GuidelineCategory;
  title: string;
  description: string;
  severity_level: SeverityLevel;
  action_required: string;
  sort_order?: number;
  created_at?: string;
}

export interface ProtocolRow {
  id: string;
  name: string;
  duration_weeks: number;
  created_at?: string;
}

export interface ProtocolWithGuidelines {
  id: string;
  name: string;
  duration_weeks: number;
  guidelines: MonitoringGuideline[];
}

export interface PatientTreatmentPlan {
  patient_id: string;
  cancer_type_id: string | null;
  active_protocol: ProtocolWithGuidelines;
  start_date: string;
}
