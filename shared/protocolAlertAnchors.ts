/**
 * Contratos alinhados às tabelas protocol_guideline_windows, protocol_alert_rules,
 * protocol_medication_watch, medication_reference (Supabase).
 */

export type ProtocolTimeAnchor = "from_cycle_start" | "from_last_infusion";

export type AlertMetricKind = "body_temperature" | "lab_platelets" | "symptom_severity" | "custom";

/** Linha retornada por RPC compute_protocol_day_anchors */
export interface ProtocolDayAnchorsRow {
  cycle_id: string;
  patient_id: string;
  protocol_id: string | null;
  start_date: string;
  days_from_cycle_start: number;
  days_from_last_infusion: number | null;
  last_infusion_at: string | null;
}

export interface ProtocolGuidelineWindowRow {
  id: string;
  protocol_id: string;
  guideline_id: string;
  time_anchor: ProtocolTimeAnchor;
  day_offset_min: number;
  day_offset_max: number | null;
  priority: number;
  created_at?: string;
}

export interface ProtocolAlertRuleRow {
  id: string;
  protocol_id: string;
  name: string;
  time_anchor: ProtocolTimeAnchor;
  day_offset_min: number;
  day_offset_max: number | null;
  metric_kind: AlertMetricKind;
  condition: Record<string, unknown>;
  severity_level: string;
  action_required: string;
  message_template: string | null;
  link_guideline_id: string | null;
  enabled: boolean;
  sort_order: number;
  created_at?: string;
}

export interface MedicationReferenceRow {
  id: string;
  canonical_name: string;
  synonyms: string[];
  normalized_name?: string;
  rxnorm_cui: string | null;
  created_at?: string;
}

export interface ProtocolMedicationWatchRow {
  id: string;
  protocol_id: string;
  medication_reference_id: string;
  guideline_id: string;
  priority: number;
  notes: string | null;
  created_at?: string;
}

export interface PatientAlertEventRow {
  id: string;
  patient_id: string;
  rule_id: string | null;
  triggered_at: string;
  payload: Record<string, unknown>;
  severity_level: string;
  message: string;
  acknowledged_at: string | null;
}
