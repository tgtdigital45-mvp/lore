import { useCallback, useEffect, useState } from "react";
import { buildRiskRow, mergeAlertRulesFromAssignments } from "@/lib/triage";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import type { HospitalEmbed, MergedAlertRules, PatientRow, RiskRow, SymptomLogTriage } from "@/types/dashboard";

type ProfileSlice = {
  full_name: string;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  phone_e164?: string | null;
  email_display?: string | null;
};

function normalizeProfile(prof: PatientRow["profiles"]): ProfileSlice | null {
  if (!prof) return null;
  const p = Array.isArray(prof) ? prof[0] : prof;
  if (!p || typeof p !== "object") return null;
  return p as ProfileSlice;
}

const DEFAULT_RULES: MergedAlertRules = {
  fever_celsius_min: 37.8,
  alert_window_hours: 72,
  ctcae_yellow_min_grade: 2,
  ctcae_red_min_grade: 3,
};

export type PatientCoreState = {
  loading: boolean;
  error: string | null;
  /** Pronto para carregar o restante (dossiê) após paciente válido. */
  ready: boolean;
  riskRow: RiskRow | null;
  triageRules: MergedAlertRules;
  watchProfileId: string | null;
  profileRefreshNonce: number;
  bumpProfileRefresh: () => void;
  /** Atualiza só `profiles` no cabeçalho (realtime) sem refetch do resto do dossié. */
  patchProfilesFromRealtime: (newRow: Record<string, unknown>) => void;
};

/** Perfil + risco + regras de triagem (staff_assignments + patients + symptom_logs resumidos). */
export function usePatientCore(patientId: string | undefined): PatientCoreState {
  const [profileRefreshNonce, setProfileRefreshNonce] = useState(0);
  const [watchProfileId, setWatchProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskRow, setRiskRow] = useState<RiskRow | null>(null);
  const [triageRules, setTriageRules] = useState<MergedAlertRules>(DEFAULT_RULES);
  const [ready, setReady] = useState(false);

  const bumpProfileRefresh = useCallback(() => setProfileRefreshNonce((n) => n + 1), []);

  const patchProfilesFromRealtime = useCallback((newRow: Record<string, unknown>) => {
    const rid = typeof newRow.id === "string" ? newRow.id : null;
    if (!rid) return;
    setRiskRow((prev) => {
      if (!prev?.profile_id || prev.profile_id !== rid) return prev;
      const cur = normalizeProfile(prev.profiles);
      if (!cur) return prev;
      const merged: ProfileSlice = {
        ...cur,
        full_name: typeof newRow.full_name === "string" ? newRow.full_name : cur.full_name,
        date_of_birth:
          newRow.date_of_birth !== undefined ? (newRow.date_of_birth as string | null) : cur.date_of_birth,
        avatar_url: newRow.avatar_url !== undefined ? (newRow.avatar_url as string | null) : cur.avatar_url,
        phone_e164: newRow.phone_e164 !== undefined ? (newRow.phone_e164 as string | null) : cur.phone_e164,
        email_display:
          newRow.email_display !== undefined ? (newRow.email_display as string | null) : cur.email_display,
      };
      return { ...prev, profiles: merged };
    });
  }, []);

  useEffect(() => {
    if (!patientId) {
      setWatchProfileId(null);
      setLoading(false);
      setReady(false);
      setRiskRow(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReady(false);
    void (async () => {
      const [{ data: assigns }, { data: prow, error: pe }] = await Promise.all([
        supabase.from("staff_assignments").select("hospital_id, hospitals ( name, alert_rules )"),
        supabase
          .from("patients")
          .select(
            "id, profile_id, cancer_type_id, primary_cancer_type, current_stage, is_in_nadir, patient_code, care_phase, sex, blood_type, cpf, occupation, insurance_plan, address_street, address_number, address_neighborhood, address_complement, address_city, address_state, is_pregnant, uses_continuous_medication, continuous_medication_notes, medical_history, allergies, height_cm, weight_kg, clinical_notes, profiles!patients_profile_id_fkey ( full_name, date_of_birth, avatar_url, phone_e164, email_display )"
          )
          .eq("id", patientId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const rules = assigns?.length
        ? mergeAlertRulesFromAssignments(assigns as { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[])
        : DEFAULT_RULES;
      setTriageRules(rules);
      if (pe || !prow) {
        setError(sanitizeSupabaseError(pe) ?? "Paciente não encontrado.");
        setRiskRow(null);
        setWatchProfileId(null);
        setReady(false);
        setLoading(false);
        return;
      }
      const rawPid = (prow as { profile_id?: unknown }).profile_id;
      setWatchProfileId(typeof rawPid === "string" ? rawPid : null);
      const p = prow as PatientRow;
      const nowMs = Date.now();
      const fetchHours = Math.max(168, rules.alert_window_hours);
      const sinceFetch = new Date(nowMs - fetchHours * 3600 * 1000).toISOString();
      const { data: logs, error: le } = await supabase
        .from("symptom_logs")
        .select(
          "patient_id, severity, logged_at, symptom_category, body_temperature, entry_kind, pain_level, nausea_level, fatigue_level, ae_max_grade, triage_semaphore"
        )
        .eq("patient_id", patientId)
        .gte("logged_at", sinceFetch);
      if (cancelled) return;
      if (le) {
        setError(sanitizeSupabaseError(le));
        setReady(false);
        setLoading(false);
        return;
      }
      const logRows = (logs ?? []) as SymptomLogTriage[];
      const rr = buildRiskRow(p, logRows, rules, nowMs);
      setRiskRow(rr);
      setReady(true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, profileRefreshNonce]);

  return {
    loading,
    error,
    ready,
    riskRow,
    triageRules,
    watchProfileId,
    profileRefreshNonce,
    bumpProfileRefresh,
    patchProfilesFromRealtime,
  };
}
