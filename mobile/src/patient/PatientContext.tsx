import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@/src/auth/AuthContext";
import { supabase } from "@/src/lib/supabase";

export type PatientProfileEmbed = {
  full_name: string;
  avatar_url: string | null;
};

export type PatientRow = {
  id: string;
  profile_id: string;
  /** Quando um cuidador gere o diário, o perfil clínico é o do paciente; o JWT é o do cuidador. */
  is_caregiver_session?: boolean;
  /** Catálogo opcional (public.cancer_types); backfill a partir do enum legado quando existir. */
  cancer_type_id?: string | null;
  primary_cancer_type: string;
  current_stage: string | null;
  hospital_id: string | null;
  patient_code: string | null;
  is_in_nadir: boolean;
  is_pregnant: boolean | null;
  uses_continuous_medication: boolean;
  continuous_medication_notes: string | null;
  medical_history: string | null;
  allergies: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  clinical_notes: string | null;
  profiles: PatientProfileEmbed | null;
};

const PATIENT_SELECT = [
  "id",
  "profile_id",
  "cancer_type_id",
  "primary_cancer_type",
  "current_stage",
  "hospital_id",
  "patient_code",
  "is_in_nadir",
  "is_pregnant",
  "uses_continuous_medication",
  "continuous_medication_notes",
  "medical_history",
  "allergies",
  "height_cm",
  "weight_kg",
  "clinical_notes",
].join(", ");

function normalizeProfilesEmbed(raw: unknown): PatientProfileEmbed | null {
  if (raw == null) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const o = row as { full_name?: unknown; avatar_url?: unknown };
  return {
    full_name: typeof o.full_name === "string" ? o.full_name : "",
    avatar_url: o.avatar_url == null || typeof o.avatar_url !== "string" ? null : o.avatar_url,
  };
}

type PatientContextValue = {
  patient: PatientRow | null;
  /** Primeira carga do perfil (TanStack Query v5: `isPending`). */
  loading: boolean;
  /** Falha ao buscar `patients` (evita mandar para onboarding por engano). */
  fetchError: Error | null;
  refresh: () => Promise<void>;
};

const PatientContext = createContext<PatientContextValue | undefined>(undefined);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user?.id;

  const { data: patient, isPending: loading, isError, error: queryError, refetch } = useQuery({
    queryKey: ["patient", uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<PatientRow | null> => {
      if (!uid) return null;
      let data: unknown = null;
      let caregiverSession = false;

      const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
      const appRole = (prof?.role as string | undefined) ?? "patient";

      const { data: own, error } = await supabase
        .from("patients")
        .select(`${PATIENT_SELECT}, profiles!patients_profile_id_fkey ( full_name, avatar_url )`)
        .eq("profile_id", uid)
        .maybeSingle();
      if (error) throw error;

      const { data: cgRows } = await supabase
        .from("patient_caregivers")
        .select("patient_id")
        .eq("caregiver_profile_id", uid)
        .order("created_at", { ascending: true })
        .limit(1);
      const linkedPid = cgRows?.[0]?.patient_id as string | undefined;

      if (appRole === "caregiver" && linkedPid) {
        const { data: forCaregiver, error: e2 } = await supabase
          .from("patients")
          .select(`${PATIENT_SELECT}, profiles!patients_profile_id_fkey ( full_name, avatar_url )`)
          .eq("id", linkedPid)
          .maybeSingle();
        if (e2) throw e2;
        data = forCaregiver;
        caregiverSession = true;
      } else if (own) {
        data = own;
      } else if (linkedPid) {
        const { data: forCaregiver, error: e2 } = await supabase
          .from("patients")
          .select(`${PATIENT_SELECT}, profiles!patients_profile_id_fkey ( full_name, avatar_url )`)
          .eq("id", linkedPid)
          .maybeSingle();
        if (e2) throw e2;
        data = forCaregiver;
        caregiverSession = true;
      }

      if (!data) return null;
      const row = data as unknown as Record<string, unknown>;
      return {
        id: String(row.id),
        profile_id: String(row.profile_id),
        is_caregiver_session: caregiverSession,
        cancer_type_id: row.cancer_type_id != null && row.cancer_type_id !== "" ? String(row.cancer_type_id) : null,
        primary_cancer_type: String(row.primary_cancer_type ?? "other"),
        current_stage: row.current_stage != null ? String(row.current_stage) : null,
        hospital_id: row.hospital_id != null ? String(row.hospital_id) : null,
        patient_code: row.patient_code != null ? String(row.patient_code) : null,
        is_in_nadir: Boolean(row.is_in_nadir),
        is_pregnant: row.is_pregnant === null || row.is_pregnant === undefined ? null : Boolean(row.is_pregnant),
        uses_continuous_medication: Boolean(row.uses_continuous_medication),
        continuous_medication_notes:
          row.continuous_medication_notes != null ? String(row.continuous_medication_notes) : null,
        medical_history: row.medical_history != null ? String(row.medical_history) : null,
        allergies: row.allergies != null ? String(row.allergies) : null,
        height_cm: row.height_cm != null && row.height_cm !== "" ? Number(row.height_cm) : null,
        weight_kg: row.weight_kg != null && row.weight_kg !== "" ? Number(row.weight_kg) : null,
        clinical_notes: row.clinical_notes != null ? String(row.clinical_notes) : null,
        profiles: normalizeProfilesEmbed(row.profiles),
      };
    },
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const fetchError = useMemo(() => {
    if (!isError || queryError == null) return null;
    return queryError instanceof Error ? queryError : new Error(String(queryError));
  }, [isError, queryError]);

  const value = useMemo<PatientContextValue>(
    () => ({
      patient: patient ?? null,
      loading: Boolean(uid) ? loading : false,
      fetchError,
      refresh,
    }),
    [patient, loading, uid, fetchError, refresh]
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used within PatientProvider");
  return ctx;
}

export function useInvalidatePatient() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useCallback(() => {
    const uid = session?.user?.id;
    void qc.invalidateQueries({ queryKey: ["patient", uid] });
    void qc.invalidateQueries({ queryKey: ["homeSummary"] });
  }, [qc, session?.user?.id]);
}
