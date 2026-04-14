import { useCallback, useEffect, useRef, useState } from "react";
import { buildRiskRow, mergeAlertRulesFromAssignments } from "@/lib/triage";
import { supabase } from "@/lib/supabase";
import type {
  BiomarkerModalRow,
  EmergencyContactEmbed,
  HospitalEmbed,
  MedicalDocModalRow,
  MedicationLogRow,
  MedicationRow,
  MergedAlertRules,
  NutritionLogRow,
  PatientRow,
  RiskRow,
  SymptomLogDetail,
  SymptomLogTriage,
  TreatmentCycleRow,
  TreatmentInfusionRow,
  VitalLogRow,
  WearableSampleRow,
  CycleReadinessRow,
} from "@/types/dashboard";

const DEFAULT_RULES: MergedAlertRules = {
  fever_celsius_min: 37.8,
  alert_window_hours: 72,
  ctcae_yellow_min_grade: 2,
  ctcae_red_min_grade: 3,
};

export function usePatientClinicalBundle(patientId: string | undefined) {
  const prevPatientIdRef = useRef<string | undefined>(undefined);
  const [profileRefreshNonce, setProfileRefreshNonce] = useState(0);
  const [watchProfileId, setWatchProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskRow, setRiskRow] = useState<RiskRow | null>(null);
  const [triageRules, setTriageRules] = useState<MergedAlertRules>(DEFAULT_RULES);
  const [cycles, setCycles] = useState<TreatmentCycleRow[]>([]);
  const [infusions, setInfusions] = useState<TreatmentInfusionRow[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLogDetail[]>([]);
  const [vitals, setVitals] = useState<VitalLogRow[]>([]);
  const [wearables, setWearables] = useState<WearableSampleRow[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogRow[]>([]);
  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLogRow[]>([]);
  const [biomarkers, setBiomarkers] = useState<BiomarkerModalRow[]>([]);
  const [medicalDocs, setMedicalDocs] = useState<MedicalDocModalRow[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactEmbed[]>([]);
  const [cycleReadiness, setCycleReadiness] = useState<CycleReadinessRow | null>(null);

  const reloadExames = useCallback(async (pid: string) => {
    const [bio, mdocs, medLogs, medCatalog] = await Promise.all([
      supabase
        .from("biomarker_logs")
        .select("id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_range, reference_alert, logged_at")
        .eq("patient_id", pid)
        .order("logged_at", { ascending: false })
        .limit(60),
      supabase
        .from("medical_documents")
        .select("id, document_type, uploaded_at, exam_performed_at, storage_path, mime_type, ai_extracted_json")
        .eq("patient_id", pid)
        .order("uploaded_at", { ascending: false })
        .limit(40),
      supabase
        .from("medication_logs")
        .select(
          "id, medication_id, patient_id, taken_at, scheduled_time, taken_time, quantity, status, notes, created_at, medications ( name, dosage )"
        )
        .eq("patient_id", pid)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("medications")
        .select("id, name, display_name, dosage, form, unit, frequency_hours, repeat_mode, anchor_at, end_date, active, notes, pinned")
        .eq("patient_id", pid)
        .order("name"),
    ]);
    setBiomarkers(
      !bio.error && bio.data
        ? (bio.data as Record<string, unknown>[]).map((row) => ({
            ...row,
            medical_document_id: (row.medical_document_id as string | null | undefined) ?? null,
          })) as BiomarkerModalRow[]
        : []
    );
    setMedicalDocs(!mdocs.error && mdocs.data ? (mdocs.data as MedicalDocModalRow[]) : []);
    setMedicationLogs(!medLogs.error && medLogs.data ? (medLogs.data as MedicationLogRow[]) : []);
    setMedications(!medCatalog.error && medCatalog.data ? (medCatalog.data as MedicationRow[]) : []);
  }, []);

  useEffect(() => {
    if (!patientId) {
      prevPatientIdRef.current = undefined;
      setWatchProfileId(null);
      setLoading(false);
      setRiskRow(null);
      setBiomarkers([]);
      setMedicalDocs([]);
      setMedications([]);
      setMedicationLogs([]);
      setEmergencyContacts([]);
      setCycleReadiness(null);
      return;
    }
    const patientChanged = prevPatientIdRef.current !== patientId;
    prevPatientIdRef.current = patientId;
    let cancelled = false;
    if (patientChanged) setLoading(true);
    setError(null);
    void (async () => {
      const { data: assigns } = await supabase.from("staff_assignments").select("hospital_id, hospitals ( name, alert_rules )");
      if (cancelled) return;
      const rules = assigns?.length
        ? mergeAlertRulesFromAssignments(assigns as { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[])
        : DEFAULT_RULES;
      setTriageRules(rules);
      const nowMs = Date.now();
      const fetchHours = Math.max(168, rules.alert_window_hours);
      const sinceFetch = new Date(nowMs - fetchHours * 3600 * 1000).toISOString();
      const sinceWear = new Date(nowMs - 14 * 86400000).toISOString();

      const { data: prow, error: pe } = await supabase
        .from("patients")
        .select(
          "id, profile_id, cancer_type_id, primary_cancer_type, current_stage, is_in_nadir, patient_code, is_pregnant, uses_continuous_medication, continuous_medication_notes, medical_history, allergies, height_cm, weight_kg, clinical_notes, profiles!patients_profile_id_fkey ( full_name, date_of_birth, avatar_url )"
        )
        .eq("id", patientId)
        .maybeSingle();
      if (cancelled) return;
      if (pe || !prow) {
        setError(pe?.message ?? "Paciente não encontrado.");
        setRiskRow(null);
        setWatchProfileId(null);
        setLoading(false);
        return;
      }
      const rawPid = (prow as { profile_id?: unknown }).profile_id;
      setWatchProfileId(typeof rawPid === "string" ? rawPid : null);
      const p = prow as PatientRow;
      const { data: logs, error: le } = await supabase
        .from("symptom_logs")
        .select(
          "patient_id, severity, logged_at, symptom_category, body_temperature, entry_kind, pain_level, nausea_level, fatigue_level, ae_max_grade, triage_semaphore"
        )
        .eq("patient_id", patientId)
        .gte("logged_at", sinceFetch);
      if (cancelled) return;
      if (le) {
        setError(le.message);
        setLoading(false);
        return;
      }
      const logRows = (logs ?? []) as SymptomLogTriage[];
      const rr = buildRiskRow(p, logRows, rules, nowMs);
      setRiskRow(rr);

      const [cyc, sym, inf, vit, wear, meds, nut, bio, mdocs, medCatalog, cr, ec] = await Promise.all([
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
          .order("logged_at", { ascending: false })
          .limit(150),
        supabase
          .from("treatment_infusions")
          .select("id, cycle_id, patient_id, session_at, status")
          .eq("patient_id", patientId)
          .order("session_at", { ascending: false })
          .limit(80),
        supabase
          .from("vital_logs")
          .select("id, logged_at, vital_type, value_numeric, value_systolic, value_diastolic, unit, notes")
          .eq("patient_id", patientId)
          .order("logged_at", { ascending: false })
          .limit(150),
        supabase
          .from("health_wearable_samples")
          .select("id, metric, value_numeric, unit, observed_start, metadata")
          .eq("patient_id", patientId)
          .gte("observed_start", sinceWear)
          .order("observed_start", { ascending: false })
          .limit(400),
        supabase
          .from("medication_logs")
          .select(
            "id, medication_id, patient_id, taken_at, scheduled_time, taken_time, quantity, status, notes, created_at, medications ( name, dosage )"
          )
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("nutrition_logs")
          .select("id, logged_at, log_type, quantity, meal_name, calories, protein_g, carbs_g, fat_g, appetite_level, notes")
          .eq("patient_id", patientId)
          .order("logged_at", { ascending: false })
          .limit(40),
        supabase
          .from("biomarker_logs")
          .select("id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_range, reference_alert, logged_at")
          .eq("patient_id", patientId)
          .order("logged_at", { ascending: false })
          .limit(60),
        supabase
          .from("medical_documents")
          .select("id, document_type, uploaded_at, exam_performed_at, storage_path, mime_type, ai_extracted_json")
          .eq("patient_id", patientId)
          .order("uploaded_at", { ascending: false })
          .limit(40),
        supabase
          .from("medications")
          .select("id, name, display_name, dosage, form, unit, frequency_hours, repeat_mode, anchor_at, end_date, active, notes, pinned")
          .eq("patient_id", patientId)
          .order("name"),
        supabase.from("cycle_readiness").select("*").eq("patient_id", patientId).limit(1).maybeSingle(),
        supabase
          .from("patient_emergency_contacts")
          .select("id, full_name, phone, relationship, sort_order")
          .eq("patient_id", patientId)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
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
      setMedicationLogs(!meds.error && meds.data ? (meds.data as MedicationLogRow[]) : []);
      setNutritionLogs(!nut.error && nut.data ? (nut.data as NutritionLogRow[]) : []);
      setBiomarkers(
        !bio.error && bio.data
          ? (bio.data as Record<string, unknown>[]).map((row) => ({
              ...row,
              medical_document_id: (row.medical_document_id as string | null | undefined) ?? null,
            })) as BiomarkerModalRow[]
          : []
      );
      setMedicalDocs(!mdocs.error && mdocs.data ? (mdocs.data as MedicalDocModalRow[]) : []);
      setMedications(!medCatalog.error && medCatalog.data ? (medCatalog.data as MedicationRow[]) : []);
      setCycleReadiness(!cr.error && cr.data ? (cr.data as CycleReadinessRow) : null);
      setEmergencyContacts(!ec.error && ec.data ? (ec.data as EmergencyContactEmbed[]) : []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, profileRefreshNonce]);

  useEffect(() => {
    if (!watchProfileId) return;
    const ch = supabase
      .channel(`dossier_profile_${watchProfileId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${watchProfileId}` },
        () => setProfileRefreshNonce((n) => n + 1)
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [watchProfileId]);

  const refreshExames = useCallback(() => {
    if (!patientId) return Promise.resolve();
    return reloadExames(patientId);
  }, [patientId, reloadExames]);

  const refreshClinicalBundle = useCallback(() => {
    setProfileRefreshNonce((n) => n + 1);
  }, []);

  return {
    loading,
    error,
    riskRow,
    triageRules,
    cycles,
    infusions,
    symptoms,
    vitals,
    wearables,
    medicationLogs,
    medications,
    nutritionLogs,
    biomarkers,
    medicalDocs,
    emergencyContacts,
    cycleReadiness,
    refreshExames,
    refreshClinicalBundle,
  };
}
