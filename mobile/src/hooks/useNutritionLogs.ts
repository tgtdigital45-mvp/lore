import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import type { PatientRow } from "@/src/hooks/usePatient";
import type { NutritionLogRow, NutritionLogType } from "@/src/types/vitalsNutrition";

const SELECT =
  "id, patient_id, logged_at, log_type, quantity, meal_name, calories, protein_g, carbs_g, fat_g, appetite_level, notes, created_at";

export type InsertNutritionInput = {
  log_type: NutritionLogType;
  quantity?: number | null;
  meal_name?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  appetite_level?: number | null;
  notes?: string | null;
  logged_at?: string;
};

export function useNutritionLogs(patient: PatientRow | null) {
  const [logs, setLogs] = useState<NutritionLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!patient) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("nutrition_logs")
      .select(SELECT)
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(400);
    if (error) {
      console.warn("[useNutritionLogs]", error.message);
      setLogs([]);
    } else {
      setLogs((data ?? []) as NutritionLogRow[]);
    }
    setLoading(false);
  }, [patient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const insertLog = useCallback(
    async (input: InsertNutritionInput) => {
      if (!patient) return { error: new Error("no patient") as Error | null };
      const row = {
        patient_id: patient.id,
        log_type: input.log_type,
        quantity: input.quantity ?? null,
        meal_name: input.meal_name ?? null,
        calories: input.calories ?? null,
        protein_g: input.protein_g ?? null,
        carbs_g: input.carbs_g ?? null,
        fat_g: input.fat_g ?? null,
        appetite_level: input.appetite_level ?? null,
        notes: input.notes ?? null,
        logged_at: input.logged_at ?? new Date().toISOString(),
      };
      const { error } = await supabase.from("nutrition_logs").insert(row);
      if (!error) await refresh();
      return { error: error ? new Error(error.message) : null };
    },
    [patient, refresh]
  );

  const deleteLog = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
      if (!error) await refresh();
      return { error: error ? new Error(error.message) : null };
    },
    [refresh]
  );

  return { logs, loading, refresh, insertLog, deleteLog };
}
