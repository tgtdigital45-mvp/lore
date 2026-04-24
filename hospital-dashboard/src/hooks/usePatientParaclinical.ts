import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { fetchParaclinical } from "@/hooks/patient/fetchParaclinical";
import type {
  BiomarkerModalRow,
  MedicalDocModalRow,
  MedicationLogRow,
  MedicationRow,
  PatientAlertRule,
} from "@/types/dashboard";

export type PatientParaclinicalState = {
  loading: boolean;
  error: string | null;
  biomarkers: BiomarkerModalRow[];
  medicalDocs: MedicalDocModalRow[];
  medicationLogs: MedicationLogRow[];
  medications: MedicationRow[];
  alertRules: PatientAlertRule[];
  refreshParaclinical: () => Promise<void>;
};

/** Biomarcadores, documentos, medicamentos e regras de alerta (um carregamento partilhado). */
export function usePatientParaclinical(patientId: string | undefined, enabled: boolean): PatientParaclinicalState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biomarkers, setBiomarkers] = useState<BiomarkerModalRow[]>([]);
  const [medicalDocs, setMedicalDocs] = useState<MedicalDocModalRow[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogRow[]>([]);
  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [alertRules, setAlertRules] = useState<PatientAlertRule[]>([]);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const [para, rulesRes] = await Promise.all([
        fetchParaclinical(patientId),
        supabase
          .from("patient_alert_rules")
          .select(
            "id, patient_id, name, kind, condition, severity, action_note, enabled, rule_type, created_at, channels, active_from, active_until, snooze_hours"
          )
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
      ]);
      setBiomarkers(para.biomarkers);
      setMedicalDocs(para.medicalDocs);
      setMedicationLogs(para.medicationLogs);
      setMedications(para.medications);
      if (rulesRes.error) {
        setError(sanitizeSupabaseError(rulesRes.error));
        setAlertRules([]);
      } else {
        setAlertRules(
          (rulesRes.data as PatientAlertRule[] | null)?.map((r) => ({
            ...r,
            condition:
              r.condition && typeof r.condition === "object" && !Array.isArray(r.condition)
                ? (r.condition as Record<string, unknown>)
                : {},
          })) ?? []
        );
      }
    } catch (e) {
      setError(e instanceof Error ? sanitizeSupabaseError(e) : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (!patientId || !enabled) {
      setBiomarkers([]);
      setMedicalDocs([]);
      setMedicationLogs([]);
      setMedications([]);
      setAlertRules([]);
      setLoading(false);
      setError(null);
      return;
    }
    void load();
  }, [patientId, enabled, load]);

  const refreshParaclinical = useCallback(async () => {
    if (!patientId) return;
    await load();
  }, [patientId, load]);

  return {
    loading,
    error,
    biomarkers,
    medicalDocs,
    medicationLogs,
    medications,
    alertRules,
    refreshParaclinical,
  };
}
