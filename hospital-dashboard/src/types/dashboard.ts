export type PatientRow = {
  id: string;
  primary_cancer_type: string;
  current_stage: string | null;
  is_in_nadir: boolean;
  profiles:
    | { full_name: string; date_of_birth?: string | null }
    | { full_name: string; date_of_birth?: string | null }[]
    | null;
};

export type TreatmentCycleRow = {
  id: string;
  protocol_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
};

export type SymptomLogDetail = {
  id: string;
  symptom_category: string;
  severity: string;
  body_temperature: number | null;
  logged_at: string;
  notes: string | null;
};

export type OutboundMessageRow = {
  id: string;
  body: string | null;
  status: string;
  created_at: string;
  error_detail: string | null;
};

export type WaProfileSnap = {
  phone_e164: string | null;
  optIn: boolean;
};

export type BiomarkerModalRow = {
  id: string;
  medical_document_id: string | null;
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string | null;
  is_abnormal: boolean;
  reference_alert: string | null;
  logged_at: string;
};

export type MedicalDocModalRow = {
  id: string;
  document_type: string;
  uploaded_at: string;
  storage_path: string;
  mime_type: string | null;
};

export type SymptomLogTriage = {
  patient_id: string;
  severity: string;
  symptom_category: string;
  body_temperature: number | null;
  logged_at: string;
};

export type MergedAlertRules = {
  fever_celsius_min: number;
  alert_window_hours: number;
};

export type HospitalEmbed = { name?: string; alert_rules?: unknown } | null;

export type RiskRow = PatientRow & {
  risk: number;
  riskLabel: string;
  riskClass: string;
  lastSymptomAt: string | null;
  hasClinicalAlert: boolean;
  alertReasons: string[];
  hasAlert24h: boolean;
};

export type HospitalMetaRow = {
  id: string;
  name: string;
  alert_rules: Record<string, unknown>;
  integration_settings: Record<string, unknown>;
};

export type MessageFeedRow = {
  id: string;
  body: string | null;
  status: string;
  created_at: string;
  patient_id: string;
  patients: { profiles: { full_name?: string } | { full_name?: string }[] | null } | null;
};

export type ModalTabId = "resumo" | "exames" | "mensagens" | "diario";

export type AuditLogRow = {
  id: string;
  ts: string;
  action_type: string;
  metadata: Record<string, unknown>;
  actor_name: string;
  patient_name: string;
};
