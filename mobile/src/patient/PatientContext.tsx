import { useQuery } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useAuth } from "@/src/auth/AuthContext";
import { supabase } from "@/src/lib/supabase";

export type PatientRow = {
  id: string;
  profile_id: string;
  primary_cancer_type: string;
  current_stage: string | null;
  hospital_id: string | null;
  is_in_nadir: boolean;
};

type PatientContextValue = {
  patient: PatientRow | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PatientContext = createContext<PatientContextValue | undefined>(undefined);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const uid = session?.user?.id;

  const { data: patient, isLoading: loading, refetch } = useQuery({
    queryKey: ["patient", uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<PatientRow | null> => {
      if (!uid) return null;
      const { data, error } = await supabase
        .from("patients")
        .select("id, profile_id, primary_cancer_type, current_stage, hospital_id, is_in_nadir")
        .eq("profile_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data as PatientRow | null;
    },
  });

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo<PatientContextValue>(
    () => ({
      patient: patient ?? null,
      loading: Boolean(uid) ? loading : false,
      refresh,
    }),
    [patient, loading, uid, refresh]
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
    void qc.invalidateQueries({ queryKey: ["patient", session?.user?.id] });
  }, [qc, session?.user?.id]);
}
