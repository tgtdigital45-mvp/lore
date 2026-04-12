import { useEffect } from "react";
import { useRouter } from "expo-router";

/** Opens /authorizations when user taps a hospital link request push notification. */
export function usePatientLinkNotificationRoutes() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    void (async () => {
      let Notifications: typeof import("expo-notifications");
      try {
        Notifications = await import("expo-notifications");
      } catch {
        return;
      }
      if (cancelled) return;

      const last = await Notifications.getLastNotificationResponseAsync();
      const d = last?.notification.request.content.data as { type?: string } | undefined;
      if (d?.type === "patient_link_request") {
        router.push("/authorizations");
      }

      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { type?: string } | undefined;
        if (data?.type === "patient_link_request") {
          router.push("/authorizations");
        }
      });
      removeListener = () => sub.remove();
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);
}
