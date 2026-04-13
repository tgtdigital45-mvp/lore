import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ClinicalTaskRow } from "@/types/dashboard";

export function useClinicalTasks(hospitalId: string | null) {
  const [tasks, setTasks] = useState<ClinicalTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user || !hospitalId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("clinical_tasks")
      .select(
        "id, hospital_id, patient_id, symptom_log_id, task_type, triage_semaphore, title, description, status, assigned_to, due_at, created_at, patients ( patient_code, profiles!patients_profile_id_fkey ( full_name ) )"
      )
      .eq("hospital_id", hospitalId)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(80);
    setLoading(false);
    if (e) {
      setError(e.message);
      setTasks([]);
      return;
    }
    setTasks((data ?? []) as ClinicalTaskRow[]);
  }, [hospitalId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hospitalId) return;
    const channel = supabase
      .channel(`clinical_tasks:${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinical_tasks", filter: `hospital_id=eq.${hospitalId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hospitalId, load]);

  const updateTask = useCallback(
    async (taskId: string, patch: Partial<Pick<ClinicalTaskRow, "status" | "assigned_to">>) => {
      const { error: e } = await supabase.from("clinical_tasks").update(patch).eq("id", taskId);
      if (e) throw e;
      await load();
    },
    [load]
  );

  return { tasks, loading, error, load, updateTask };
}
