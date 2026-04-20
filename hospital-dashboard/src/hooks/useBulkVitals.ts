import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { VitalLogRow } from "@/types/dashboard";

const WINDOW_MS = 48 * 3600000;

/** Um pedido: últimos vital_logs por paciente (janela 48h) para sparklines no painel. */
export function useBulkVitals(patientIds: string[]) {
  const key = useMemo(() => [...new Set(patientIds)].sort().join(","), [patientIds]);
  const [map, setMap] = useState<Record<string, VitalLogRow[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = [...new Set(patientIds)].filter(Boolean);
    if (ids.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    void (async () => {
      const { data, error } = await supabase
        .from("vital_logs")
        .select("id, patient_id, logged_at, vital_type, value_numeric, value_systolic, value_diastolic, unit, notes")
        .in("patient_id", ids)
        .gte("logged_at", since)
        .order("logged_at", { ascending: false })
        .limit(2000);
      if (cancelled) return;
      if (error) {
        setMap({});
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as (VitalLogRow & { patient_id: string })[];
      const by: Record<string, VitalLogRow[]> = {};
      for (const id of ids) by[id] = [];
      for (const r of rows) {
        const pid = r.patient_id;
        if (!by[pid]) by[pid] = [];
        const { patient_id: pidDrop, ...rest } = r;
        void pidDrop;
        by[pid].push(rest);
      }
      setMap(by);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { vitalsByPatient: map, vitalsLoading: loading };
}
