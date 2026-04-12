import { useEffect } from "react";
import Constants from "expo-constants";
import { useAuth } from "@/src/auth/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { ensureNotificationPermissions } from "@/src/utils/notifications";

export function usePushTokenRegistration() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;

    void (async () => {
      const ok = await ensureNotificationPermissions();
      if (!ok || cancelled) return;
      try {
        const Notifications = await import("expo-notifications");
        const projectId =
          typeof Constants.expoConfig?.extra?.eas?.projectId === "string"
            ? Constants.expoConfig.extra.eas.projectId
            : undefined;
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : ({} as { projectId?: string })
        );
        const token = tokenData.data;
        if (!token || cancelled) return;
        await supabase
          .from("profiles")
          .update({ expo_push_token: token, expo_push_token_updated_at: new Date().toISOString() })
          .eq("id", session.user.id);
      } catch {
        /* simulador / sem projeto EAS */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);
}
