import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Refetch clínico em segundo plano quando chegam sintomas ou vitais novos para o paciente
 * (debounce para agrupar rajadas de eventos).
 */
export function usePatientClinicalSliceRealtime(
  patientId: string | undefined,
  enabled: boolean,
  refetchClinical: () => void
) {
  const refetchRef = useRef(refetchClinical);
  refetchRef.current = refetchClinical;
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!patientId || !enabled) return;
    const scope = crypto.randomUUID();
    const filter = `patient_id=eq.${patientId}`;
    const schedule = () => {
      if (tRef.current) clearTimeout(tRef.current);
      tRef.current = setTimeout(() => {
        tRef.current = null;
        refetchRef.current();
      }, 400);
    };
    const ch = supabase
      .channel(`dossier_clinical_slice_${patientId}_${scope}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "symptom_logs", filter }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "symptom_logs", filter }, schedule)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vital_logs", filter }, schedule)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vital_logs", filter }, schedule)
      .subscribe();
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
      void ch.unsubscribe();
      void supabase.removeChannel(ch);
    };
  }, [patientId, enabled]);
}
