export type EmergencyContactEmbed = {
  id: string;
  full_name: string;
  phone: string;
  relationship: string | null;
  sort_order?: number;
};

export type PatientRow = {
  id: string;
  /** auth.users / profiles.id do titular (útil para subscrições em tempo real) */
  profile_id?: string;
  primary_cancer_type: string;
  current_stage: string | null;
  is_in_nadir: boolean;
  /** Public Aura code (AURA-XXXXXX) for hospital linking */
  patient_code?: string | null;
  is_pregnant?: boolean | null;
  uses_continuous_medication?: boolean;
  continuous_medication_notes?: string | null;
  medical_history?: string | null;
  allergies?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  clinical_notes?: string | null;
  patient_emergency_contacts?: EmergencyContactEmbed[] | EmergencyContactEmbed | null;
  profiles:
    | { full_name: string; date_of_birth?: string | null; avatar_url?: string | null }
    | { full_name: string; date_of_birth?: string | null; avatar_url?: string | null }[]
    | null;
};

export type PatientHospitalLinkMgmtRow = {
  id: string;
  status: string;
  permission_level: string;
  requested_at: string;
  patients:
    | { id: string; patient_code?: string | null; profiles: { full_name?: string } | { full_name?: string }[] | null }
    | null;
  hospitals: { id: string; name: string } | { id: string; name: string }[] | null;
};

export type TreatmentCycleRow = {
  id: string;
  protocol_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at?: string;
  treatment_kind?: string;
  notes?: string | null;
  planned_sessions?: number | null;
  completed_sessions?: number | null;
  last_session_at?: string | null;
  last_weight_kg?: number | null;
  infusion_interval_days?: number | null;
};

export type MedicationRow = {
  id: string;
  name: string;
  display_name?: string | null;
  dosage: string | null;
  form: string | null;
  unit?: string | null;
  frequency_hours: number;
  repeat_mode?: string | null;
  active: boolean;
  anchor_at: string;
  end_date: string | null;
  notes: string | null;
  pinned?: boolean | null;
};

export type MedicationLogRow = {
  id: string;
  medication_id: string;
  patient_id?: string;
  /** Preferido (schema atual) */
  taken_at?: string;
  scheduled_time?: string;
  taken_time?: string | null;
  quantity?: number;
  status?: string;
  notes?: string | null;
  created_at?: string;
  medications: { name: string; dosage: string | null } | { name: string; dosage: string | null }[] | null;
};

export type SymptomLogDetail = {
  id: string;
  symptom_category: string | null;
  severity: string | null;
  body_temperature: number | null;
  logged_at: string;
  notes: string | null;
  /** PRD diary: sliders; legacy: category + severity */
  entry_kind?: string | null;
  pain_level?: number | null;
  nausea_level?: number | null;
  fatigue_level?: number | null;
  requires_action?: boolean | null;
  mood?: string | null;
  symptom_started_at?: string | null;
  symptom_ended_at?: string | null;
  ae_max_grade?: number | null;
  flow_context?: Record<string, unknown> | null;
  triage_semaphore?: string | null;
};

/** Sinais vitais registrados na app (temperatura, PA, etc.). */
export type VitalLogRow = {
  id: string;
  logged_at: string;
  vital_type: string;
  value_numeric: number | null;
  value_systolic: number | null;
  value_diastolic: number | null;
  unit: string | null;
  notes: string | null;
};

/** Registros do diário de nutrição (água, refeições, apetite) — não confundir com exames anexados. */
export type NutritionLogRow = {
  id: string;
  logged_at: string;
  log_type: string;
  quantity: number | null;
  meal_name: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  appetite_level: number | null;
  notes: string | null;
};

export type OutboundMessageRow = {
  id: string;
  body: string | null;
  status: string;
  created_at: string;
  error_detail: string | null;
  symptom_log_id?: string | null;
};

export type ClinicalTaskRow = {
  id: string;
  hospital_id: string;
  patient_id: string;
  symptom_log_id: string;
  task_type: string;
  triage_semaphore: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  due_at: string | null;
  created_at: string;
  patients?: {
    patient_code?: string | null;
    profiles?: { full_name?: string } | { full_name?: string }[] | null;
  } | null;
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
  /** Intervalo de referência tal como no documento (ex.: hemograma). */
  reference_range: string | null;
  reference_alert: string | null;
  logged_at: string;
};

export type MedicalDocModalRow = {
  id: string;
  document_type: string;
  uploaded_at: string;
  exam_performed_at: string | null;
  storage_path: string;
  mime_type: string | null;
  /** Metadados extraídos pela IA (título, resumo, médico, etc.) — alinhado à app móvel. */
  ai_extracted_json: Record<string, unknown> | null;
};

export type SymptomLogTriage = {
  patient_id: string;
  severity: string | null;
  symptom_category: string | null;
  body_temperature: number | null;
  logged_at: string;
  entry_kind?: string | null;
  pain_level?: number | null;
  nausea_level?: number | null;
  fatigue_level?: number | null;
  ae_max_grade?: number | null;
  triage_semaphore?: string | null;
};

export type MergedAlertRules = {
  fever_celsius_min: number;
  alert_window_hours: number;
  ctcae_yellow_min_grade?: number;
  ctcae_red_min_grade?: number;
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
  /** Pior semáforo na janela de triagem (derivado de `symptom_logs.triage_semaphore`). */
  urgencySemaphore: "red" | "yellow" | "green" | null;
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

/** Sessões de infusão (quimio / imuno) — ver `treatment_infusions`. */
export type TreatmentInfusionRow = {
  id: string;
  cycle_id: string;
  patient_id: string;
  session_at: string;
  status: string;
};

/** Vista `cycle_readiness` — heurística MVP. */
export type CycleReadinessRow = {
  patient_id: string;
  hospital_id: string | null;
  cycle_id: string | null;
  protocol_name: string | null;
  cycle_status: string | null;
  start_date: string | null;
  last_high_ae_at: string | null;
  last_fever_log_at: string | null;
  has_recent_labs_doc: boolean | null;
  readiness_status: "hold" | "likely_ok" | "review";
  readiness_reasons: string[] | null;
};

/** Amostras Apple Health / wearables — ver `health_wearable_samples`. */
export type WearableSampleRow = {
  id: string;
  metric: string;
  value_numeric: number | null;
  unit: string | null;
  observed_start: string;
  metadata: Record<string, unknown>;
};
