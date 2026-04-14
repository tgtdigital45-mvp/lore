import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import type { PatientRow } from "@/src/hooks/usePatient";
import type { TreatmentCycleRow, TreatmentInfusionRow } from "@/src/types/treatment";

const CYCLE_SELECT =
  "id, patient_id, protocol_id, protocol_name, start_date, end_date, status, treatment_kind, notes, planned_sessions, completed_sessions, last_session_at, last_weight_kg, infusion_interval_days, created_at";

const INFUSION_SELECT =
  "id, patient_id, cycle_id, session_at, status, weight_kg, notes, created_at, updated_at";

export function useTreatmentCycles(patient: PatientRow | null) {
  const [cycles, setCycles] = useState<TreatmentCycleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patient) {
      setCycles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("treatment_cycles")
      .select(CYCLE_SELECT)
      .eq("patient_id", patient.id)
      .order("start_date", { ascending: false });
    if (error) {
      console.warn("[useTreatmentCycles]", error.message);
      setCycles([]);
    } else {
      setCycles((data ?? []) as TreatmentCycleRow[]);
    }
    setLoading(false);
  }, [patient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const fetchInfusions = useCallback(async (cycleId: string) => {
    const { data, error } = await supabase
      .from("treatment_infusions")
      .select(INFUSION_SELECT)
      .eq("cycle_id", cycleId)
      .order("session_at", { ascending: true });
    if (error) {
      console.warn("[fetchInfusions]", error.message);
      return [] as TreatmentInfusionRow[];
    }
    return (data ?? []) as TreatmentInfusionRow[];
  }, []);

  return { cycles, loading, refresh, fetchInfusions };
}
