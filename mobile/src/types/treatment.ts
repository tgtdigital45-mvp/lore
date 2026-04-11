export type TreatmentKind = "chemotherapy" | "radiotherapy" | "hormone" | "immunotherapy" | "other";

export type InfusionSessionStatus = "scheduled" | "completed" | "cancelled";

export type TreatmentCycleRow = {
  id: string;
  patient_id?: string;
  protocol_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  treatment_kind?: TreatmentKind;
  notes: string | null;
  planned_sessions: number | null;
  completed_sessions: number | null;
  last_session_at: string | null;
  last_weight_kg: number | null;
  infusion_interval_days?: number | null;
  created_at?: string;
};

export type TreatmentInfusionRow = {
  id: string;
  patient_id: string;
  cycle_id: string;
  session_at: string;
  status: InfusionSessionStatus;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
