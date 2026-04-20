import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import type {
  CycleReadinessRow,
  EmergencyContactEmbed,
  MergedAlertRules,
  NutritionLogRow,
  PatientAppointmentRow,
  SymptomLogDetail,
  TreatmentCycleRow,
  TreatmentInfusionRow,
  VitalLogRow,
  WearableSampleRow,
} from "@/types/dashboard";

export type PatientClinicalDataState = {
  loading: boolean;
  error: string | null;
  cycles: TreatmentCycleRow[];
  infusions: TreatmentInfusionRow[];
  symptoms: SymptomLogDetail[];
  vitals: VitalLogRow[];
  wearables: WearableSampleRow[];
  nutritionLogs: NutritionLogRow[];
  appointments: PatientAppointmentRow[];
  cycleReadiness: CycleReadinessRow | null;
  emergencyContacts: EmergencyContactEmbed[];
  /** Refetch só o bloco clínico (ciclos, sintomas, vitais, etc.). */
  refetchClinical: () => void;
};

/** Ciclos, sintomas detalhados, infusões, vitais, wearables, nutrição, contactos de emergência. */
export function usePatientClinicalData(
  patientId: string | undefined,
  enabled: boolean,
  triageRules: MergedAlertRules
): PatientClinicalDataState {
  const [reloadNonce, setReloadNonce] = useState(0);
  const refetchClinical = useCallback(() => setReloadNonce((n) => n + 1), []);
  const hadClinicalDataRef = useRef(false);
  const lastPatientIdRef = useRef<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<TreatmentCycleRow[]>([]);
  const [infusions, setInfusions] = useState<TreatmentInfusionRow[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLogDetail[]>([]);
  const [vitals, setVitals] = useState<VitalLogRow[]>([]);
  const [wearables, setWearables] = useState<WearableSampleRow[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLogRow[]>([]);
  const [appointments, setAppointments] = useState<PatientAppointmentRow[]>([]);
  const [cycleReadiness, setCycleReadiness] = useState<CycleReadinessRow | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactEmbed[]>([]);

  useEffect(() => {
    if (!patientId || !enabled) {
      setCycles([]);
      setInfusions([]);
      setSymptoms([]);
      setVitals([]);
      setWearables([]);
      setNutritionLogs([]);
      setAppointments([]);
      setCycleReadiness(null);
      setEmergencyContacts([]);
      hadClinicalDataRef.current = false;
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    if (lastPatientIdRef.current !== patientId) {
      lastPatientIdRef.current = patientId;
      hadClinicalDataRef.current = false;
    }
    const silent = hadClinicalDataRef.current;
    if (!silent) setLoading(true);
    setError(null);
    void (async () => {
      const nowMs = Date.now();
      const fetchHours = Math.max(168, triageRules.alert_window_hours);
      const sinceFetch = new Date(nowMs - fetchHours * 3600 * 1000).toISOString();
      /** Janela longa só para vital_logs — aba Sinais vitais (filtros até 1 ano). */
      const sinceVitals = new Date(nowMs - 400 * 86400000).toISOString();
      const sinceWear = new Date(nowMs - 14 * 86400000).toISOString();

      const [cyc, sym, inf, vit, wear, nut, appt, cr, ec] = await Promise.all([
        supabase
          .from("treatment_cycles")
          .select(
            "id, protocol_id, protocol_name, start_date, end_date, status, treatment_kind, notes, planned_sessions, completed_sessions, last_session_at, last_weight_kg, infusion_interval_days"
          )
          .eq("patient_id", patientId)
          .order("start_date", { ascending: false })
          .limit(36),
        supabase
          .from("symptom_logs")
          .select(
            "id, symptom_category, severity, body_temperature, logged_at, notes, entry_kind, pain_level, nausea_level, fatigue_level, requires_action, mood, symptom_started_at, symptom_ended_at, ae_max_grade, flow_context, triage_semaphore"
          )
          .eq("patient_id", patientId)
          .gte("logged_at", sinceFetch)
          .order("logged_at", { ascending: false })
          .limit(150),
        supabase
          .from("treatment_infusions")
          .select("id, cycle_id, patient_id, session_at, status, weight_kg, notes")
          .eq("patient_id", patientId)
          .order("session_at", { ascending: false })
          .limit(80),
        supabase
          .from("vital_logs")
          .select("id, logged_at, vital_type, value_numeric, value_systolic, value_diastolic, unit, notes")
          .eq("patient_id", patientId)
          .gte("logged_at", sinceVitals)
          .order("logged_at", { ascending: false })
          .limit(2000),
        supabase
          .from("health_wearable_samples")
          .select("id, metric, value_numeric, unit, observed_start, metadata")
          .eq("patient_id", patientId)
          .gte("observed_start", sinceWear)
          .order("observed_start", { ascending: false })
          .limit(400),
        supabase
          .from("nutrition_logs")
          .select("id, logged_at, log_type, quantity, meal_name, calories, protein_g, carbs_g, fat_g, appetite_level, notes")
          .eq("patient_id", patientId)
          .order("logged_at", { ascending: false })
          .limit(40),
        supabase
          .from("patient_appointments")
          .select(
            "id, patient_id, title, kind, starts_at, reminder_minutes_before, notes, pinned, infusion_booking_id, checked_in_at, checked_in_source"
          )
          .eq("patient_id", patientId)
          .order("starts_at", { ascending: false })
          .limit(200),
        supabase.from("cycle_readiness").select("*").eq("patient_id", patientId).limit(1).maybeSingle(),
        supabase
          .from("patient_emergency_contacts")
          .select("id, full_name, phone, relationship, sort_order")
          .eq("patient_id", patientId)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      const err = [cyc, sym, inf, vit, wear, nut, appt, cr, ec].find((r) => r.error)?.error;
      if (err) {
        setError(sanitizeSupabaseError(err));
        setLoading(false);
        return;
      }
      setCycles(!cyc.error && cyc.data ? (cyc.data as TreatmentCycleRow[]) : []);
      setSymptoms(!sym.error && sym.data ? (sym.data as SymptomLogDetail[]) : []);
      setInfusions(!inf.error && inf.data ? (inf.data as TreatmentInfusionRow[]) : []);
      setVitals(!vit.error && vit.data ? (vit.data as VitalLogRow[]) : []);
      setWearables(
        !wear.error && wear.data
          ? (wear.data as Record<string, unknown>[]).map((row) => ({
              ...row,
              metadata:
                typeof row.metadata === "object" && row.metadata !== null && !Array.isArray(row.metadata)
                  ? (row.metadata as Record<string, unknown>)
                  : {},
            })) as WearableSampleRow[]
          : []
      );
      setNutritionLogs(!nut.error && nut.data ? (nut.data as NutritionLogRow[]) : []);
      setAppointments(!appt.error && appt.data ? (appt.data as PatientAppointmentRow[]) : []);
      setCycleReadiness(!cr.error && cr.data ? (cr.data as CycleReadinessRow) : null);
      setEmergencyContacts(!ec.error && ec.data ? (ec.data as EmergencyContactEmbed[]) : []);
      hadClinicalDataRef.current = true;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, enabled, triageRules.alert_window_hours, reloadNonce]);

  return {
    loading,
    error,
    cycles,
    infusions,
    symptoms,
    vitals,
    wearables,
    nutritionLogs,
    appointments,
    cycleReadiness,
    emergencyContacts,
    refetchClinical,
  };
}
