import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { usePatient } from "@/src/hooks/usePatient";
import { rescheduleAllForPatient, scheduleMedicationNotifications } from "@/src/lib/medicationNotifications";
import { supabase } from "@/src/lib/supabase";

export type MedicationScheduleSlot = {
  id: string;
  medication_id?: string;
  time_of_day: string;
  quantity: number;
};

export type MedicationRow = {
  id: string;
  patient_id: string;
  name: string;
  dosage: string | null;
  form: string | null;
  frequency_hours: number;
  anchor_at: string;
  end_date: string | null;
  active: boolean;
  notes: string | null;
  shape?: string | null;
  color_left?: string | null;
  color_right?: string | null;
  color_bg?: string | null;
  unit?: string | null;
  display_name?: string | null;
  pinned?: boolean;
  repeat_mode?: "daily" | "weekdays" | "interval_hours" | "as_needed";
  schedule_weekdays?: number[] | null;
  medication_schedules?: MedicationScheduleSlot[];
};

export function useMedications() {
  const { patient } = usePatient();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["medications", patient?.id],
    enabled: Boolean(patient?.id),
    queryFn: async (): Promise<MedicationRow[]> => {
      if (!patient) return [];
      const { data: meds, error } = await supabase
        .from("medications")
        .select(
          "id, patient_id, name, dosage, form, frequency_hours, anchor_at, end_date, active, notes, shape, color_left, color_right, color_bg, unit, display_name, pinned, repeat_mode, schedule_weekdays"
        )
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (meds ?? []) as MedicationRow[];
      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      const { data: slots, error: e2 } = await supabase
        .from("medication_schedules")
        .select("id, medication_id, time_of_day, quantity")
        .in("medication_id", ids);
      if (e2) throw e2;

      const byMed = new Map<string, MedicationScheduleSlot[]>();
      for (const s of slots ?? []) {
        const mid = s.medication_id as string;
        const arr = byMed.get(mid) ?? [];
        arr.push({
          id: s.id as string,
          time_of_day: s.time_of_day as string,
          quantity: s.quantity as number,
        });
        byMed.set(mid, arr);
      }

      return rows.map((m) => ({ ...m, medication_schedules: byMed.get(m.id) ?? [] }));
    },
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["medications", patient?.id] });
  }, [qc, patient?.id]);

  const afterMedicationChange = useCallback(async (rows: MedicationRow[]) => {
    await rescheduleAllForPatient(rows.filter((r) => r.active));
  }, []);

  return {
    medications: q.data ?? [],
    loading: q.isLoading,
    refresh,
    rescheduleNotifications: afterMedicationChange,
    scheduleOne: scheduleMedicationNotifications,
  };
}
