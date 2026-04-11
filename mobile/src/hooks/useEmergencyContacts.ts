import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/src/lib/supabase";

export type EmergencyContactRow = {
  id: string;
  full_name: string;
  phone: string;
  relationship: string | null;
  sort_order: number;
};

export function emergencyContactsQueryKey(patientId: string | null) {
  return ["emergency_contacts", patientId] as const;
}

export function useEmergencyContacts(patientId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: emergencyContactsQueryKey(patientId),
    enabled: Boolean(patientId),
    queryFn: async (): Promise<EmergencyContactRow[]> => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("patient_emergency_contacts")
        .select("id, full_name, phone, relationship, sort_order")
        .eq("patient_id", patientId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmergencyContactRow[];
    },
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: emergencyContactsQueryKey(patientId) });
  }, [qc, patientId]);

  return { ...query, invalidate };
}
