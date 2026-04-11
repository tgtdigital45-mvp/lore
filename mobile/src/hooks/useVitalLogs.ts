import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import type { PatientRow } from "@/src/hooks/usePatient";
import type { VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

const SELECT = "id, patient_id, logged_at, vital_type, value_numeric, value_systolic, value_diastolic, unit, notes, created_at";

export type InsertVitalInput = {
  vital_type: VitalType;
  value_numeric?: number | null;
  value_systolic?: number | null;
  value_diastolic?: number | null;
  unit?: string | null;
  notes?: string | null;
  logged_at?: string;
};

export function useVitalLogs(patient: PatientRow | null) {
  const [logs, setLogs] = useState<VitalLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patient) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("vital_logs")
      .select(SELECT)
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(200);
    if (error) {
      console.warn("[useVitalLogs]", error.message);
      setLogs([]);
    } else {
      setLogs((data ?? []) as VitalLogRow[]);
    }
    setLoading(false);
  }, [patient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const insertLog = useCallback(
    async (input: InsertVitalInput) => {
      if (!patient) return { error: new Error("no patient") as Error | null };
      const row = {
        patient_id: patient.id,
        vital_type: input.vital_type,
        value_numeric: input.value_numeric ?? null,
        value_systolic: input.value_systolic ?? null,
        value_diastolic: input.value_diastolic ?? null,
        unit: input.unit ?? null,
        notes: input.notes ?? null,
        logged_at: input.logged_at ?? new Date().toISOString(),
      };
      const { error } = await supabase.from("vital_logs").insert(row);
      if (!error) await refresh();
      return { error: error ? new Error(error.message) : null };
    },
    [patient, refresh]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("vital_logs").delete().eq("id", id);
      if (!error) await refresh();
      return { error: error ? new Error(error.message) : null };
    },
    [refresh]
  );

  return { logs, loading, refresh, insertLog, deleteLog };
}
