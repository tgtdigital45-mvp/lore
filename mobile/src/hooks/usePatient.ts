import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/auth/AuthContext";

export type PatientRow = {
  id: string;
  profile_id: string;
  primary_cancer_type: string;
  current_stage: string | null;
  hospital_id: string | null;
  is_in_nadir: boolean;
};

export function usePatient() {
  const { session } = useAuth();
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setPatient(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("id, profile_id, primary_cancer_type, current_stage, hospital_id, is_in_nadir")
      .eq("profile_id", session.user.id)
      .maybeSingle();
    if (error) {
      console.warn(error.message);
      setPatient(null);
    } else {
      setPatient(data as PatientRow | null);
    }
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { patient, loading, refresh };
}
