import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { usePatientCore } from "./usePatientCore";
import { usePatientClinicalData } from "./usePatientClinicalData";
import { usePatientParaclinical } from "./usePatientParaclinical";
import { usePatientClinicalSliceRealtime } from "./usePatientClinicalSliceRealtime";

/**
 * Orquestra dados do dossiê: `usePatientCore`, `usePatientClinicalData`, `usePatientParaclinical`.
 * Ver também `usePatientMedications` / `usePatientExams` (aliases semânticos do paraclínico).
 */
export function usePatientClinicalBundle(patientId: string | undefined) {
  const core = usePatientCore(patientId);
  const { triageRules, bumpProfileRefresh, watchProfileId, patchProfilesFromRealtime } = core;
  const enabled = Boolean(patientId && core.ready && !core.error);

  const clinical = usePatientClinicalData(patientId, enabled, triageRules);
  const para = usePatientParaclinical(patientId, enabled);

  const loading = core.loading || clinical.loading || para.loading;
  const error = core.error ?? clinical.error ?? para.error;

  useEffect(() => {
    if (!watchProfileId) return;
    const instance =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(`dossier_profile_${watchProfileId}_${instance}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${watchProfileId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          if (row && typeof row === "object") patchProfilesFromRealtime(row);
        }
      )
      .subscribe();
    return () => {
      void ch.unsubscribe();
      void supabase.removeChannel(ch);
    };
  }, [watchProfileId, patchProfilesFromRealtime]);

  usePatientClinicalSliceRealtime(patientId, enabled, clinical.refetchClinical);

  const refreshExames = useCallback(() => {
    if (!patientId) return Promise.resolve();
    return para.refreshParaclinical();
  }, [patientId, para.refreshParaclinical]);

  const refreshClinicalBundle = useCallback(() => {
    bumpProfileRefresh();
    clinical.refetchClinical();
    void para.refreshParaclinical();
  }, [bumpProfileRefresh, clinical.refetchClinical, para.refreshParaclinical]);

  const refreshCore = useCallback(() => {
    bumpProfileRefresh();
  }, [bumpProfileRefresh]);

  const refreshClinical = useCallback(() => {
    clinical.refetchClinical();
  }, [clinical.refetchClinical]);

  const refreshParaclinical = useCallback(() => {
    void para.refreshParaclinical();
  }, [para.refreshParaclinical]);

  const refreshAlertRules = refreshParaclinical;

  return {
    loading,
    error,
    riskRow: core.riskRow,
    triageRules: core.triageRules,
    cycles: clinical.cycles,
    infusions: clinical.infusions,
    symptoms: clinical.symptoms,
    vitals: clinical.vitals,
    wearables: clinical.wearables,
    medicationLogs: para.medicationLogs,
    medications: para.medications,
    nutritionLogs: clinical.nutritionLogs,
    appointments: clinical.appointments,
    biomarkers: para.biomarkers,
    medicalDocs: para.medicalDocs,
    emergencyContacts: clinical.emergencyContacts,
    cycleReadiness: clinical.cycleReadiness,
    alertRules: para.alertRules,
    refreshExames,
    refreshClinicalBundle,
    refreshCore,
    refreshClinical,
    refreshParaclinical,
    refreshAlertRules,
  };
}
