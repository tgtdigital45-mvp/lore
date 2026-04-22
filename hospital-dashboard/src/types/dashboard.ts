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
  /** Catálogo public.cancer_types (opcional). */
  cancer_type_id?: string | null;
  primary_cancer_type: string;
  current_stage: string | null;
  is_in_nadir: boolean;
  /** Public Aura code (AURA-XXXXXX) for hospital linking */
  patient_code?: string | null;
  /** M / F / I (intersexo) / O (outro) */
  sex?: string | null;
  blood_type?: string | null;
  cpf?: string | null;
  occupation?: string | null;
  insurance_plan?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_neighborhood?: string | null;
  address_complement?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  is_pregnant?: boolean | null;
  uses_continuous_medication?: boolean;
  continuous_medication_notes?: string | null;
  medical_history?: string | null;
  allergies?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  clinical_notes?: string | null;
  /** Fase assistencial (dossiê adaptativo). */
  care_phase?:
    | "active_treatment"
    | "consolidation"
    | "maintenance"
    | "follow_up"
    | "palliative"
    | string
    | null;
  patient_emergency_contacts?: EmergencyContactEmbed[] | EmergencyContactEmbed | null;
  profiles:
    | {
        full_name: string;
        date_of_birth?: string | null;
        avatar_url?: string | null;
        phone_e164?: string | null;
        email_display?: string | null;
        whatsapp_opt_in_at?: string | null;
        whatsapp_opt_in_revoked_at?: string | null;
      }
    | {
        full_name: string;
        date_of_birth?: string | null;
        avatar_url?: string | null;
        phone_e164?: string | null;
        email_display?: string | null;
        whatsapp_opt_in_at?: string | null;
        whatsapp_opt_in_revoked_at?: string | null;
      }[]
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

/** Pedido de vínculo criado pelo staff (Adicionar por código), ainda não aprovado pelo paciente no app. */
export type PendingStaffLinkRequest = {
  id: string;
  patient_id: string;
  hospital_id: string;
  requested_at: string;
  patient_code: string;
  patient_name: string;
};

export type TreatmentCycleRow = {
  id: string;
  protocol_id?: string | null;
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

/** Compromissos do calendário do paciente (`patient_appointments`) — alinhado à app móvel. */
export type PatientAppointmentRow = {
  id: string;
  patient_id: string;
  title: string;
  kind: string;
  starts_at: string;
  reminder_minutes_before: number;
  notes: string | null;
  pinned: boolean;
  infusion_booking_id: string | null;
  checked_in_at: string | null;
  checked_in_source: "patient" | "staff" | null;
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

/** Mensagens WhatsApp recebidas (webhook Evolution → backend). */
export type WhatsappInboundRow = {
  id: string;
  body: string | null;
  from_phone: string | null;
  created_at: string;
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
  is_critical?: boolean;
  critical_low?: number | null;
  critical_high?: number | null;
  evaluation_type?: string | null;
  response_category?: string | null;
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
  notes?: string | null;
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
  /** Risco de suspensão 0–100 (heurística alinhada ao dossiê). */
  suspensionRiskScore: number;
};

export type HospitalMetaRow = {
  id: string;
  name: string;
  alert_rules: Record<string, unknown>;
  integration_settings: Record<string, unknown>;
  logo_url?: string | null;
  brand_color_hex?: string | null;
  display_name?: string | null;
  triage_config?: Record<string, unknown>;
  alert_webhook_url?: string | null;
  fhir_export_enabled?: boolean;
};

export type MessageFeedRow = {
  id: string;
  body: string | null;
  status: string;
  created_at: string;
  patient_id: string;
  patients: { profiles: { full_name?: string } | { full_name?: string }[] | null } | null;
};

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
  weight_kg: number | null;
  notes: string | null;
};

/** Regras de alerta por paciente (`patient_alert_rules`). */
export type PatientAlertRuleKind = "symptom_fever" | "medication_overuse" | "custom";

export type PatientAlertRule = {
  id: string;
  patient_id: string;
  name: string;
  kind: PatientAlertRuleKind;
  condition: Record<string, unknown>;
  severity: string;
  action_note: string | null;
  enabled: boolean;
  created_at: string;
  channels?: { push?: boolean; whatsapp?: boolean; sms?: boolean } | null;
  active_from?: string | null;
  active_until?: string | null;
  snooze_hours?: number | null;
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

/** Regras de heurística `public.heuristic_rules` (risco de suspensão). */
export type HeuristicRule = {
  id: string;
  category: string;
  rule_name: string;
  condition_json: Record<string, unknown>;
  points: number;
  time_window_hours: number;
  priority: number;
  description: string | null;
  is_active: boolean;
};
