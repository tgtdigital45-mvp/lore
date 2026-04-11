import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

/** Opens /authorizations when user taps a hospital link request push notification. */
export function usePatientLinkNotificationRoutes() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      const d = last?.notification.request.content.data as { type?: string } | undefined;
      if (d?.type === "patient_link_request") {
        router.push("/authorizations");
      }
    })();
  }, [router]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const d = response.notification.request.content.data as { type?: string } | undefined;
      if (d?.type === "patient_link_request") {
        router.push("/authorizations");
      }
    });
    return () => sub.remove();
  }, [router]);
}
