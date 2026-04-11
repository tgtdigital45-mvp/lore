import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/auth/AuthContext";
import { supabase } from "@/src/lib/supabase";

export type ConsentNotificationRow = {
  notify_medications: boolean;
  notify_appointments: boolean;
  notify_symptoms: boolean;
  consent_notifications: boolean;
};

export function usePatientConsentNotifications() {
  const { session } = useAuth();
  const uid = session?.user?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["patient_consent_notifs", uid],
    enabled: Boolean(uid),
    queryFn: async (): Promise<ConsentNotificationRow | null> => {
      if (!uid) return null;
      const { data, error } = await supabase
        .from("patient_consents")
        .select("notify_medications, notify_appointments, notify_symptoms, consent_notifications")
        .eq("profile_id", uid)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as ConsentNotificationRow;
    },
  });

  const updatePrefs = useMutation({
    mutationFn: async (patch: Partial<Pick<ConsentNotificationRow, "notify_medications" | "notify_appointments" | "notify_symptoms" | "consent_notifications">>) => {
      if (!uid) throw new Error("no user");
      const { error } = await supabase.from("patient_consents").update(patch).eq("profile_id", uid);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["patient_consent_notifs", uid] });
      await qc.invalidateQueries({ queryKey: ["patient_consents", uid] });
    },
  });

  return {
    ...query,
    updatePrefs,
  };
}
