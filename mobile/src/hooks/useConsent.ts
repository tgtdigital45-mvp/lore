import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/auth/AuthContext";
import { supabase } from "@/src/lib/supabase";

export function useConsent() {
  const { session } = useAuth();
  const uid = session?.user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["patient_consents", uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      if (!uid) return null;
      const { data: row, error } = await supabase
        .from("patient_consents")
        .select("id, policy_version")
        .eq("profile_id", uid)
        .maybeSingle();
      if (error) throw error;
      return row;
    },
  });

  return {
    hasConsent: Boolean(data),
    loading: Boolean(uid) ? isLoading : false,
    refetchConsent: refetch,
  };
}
