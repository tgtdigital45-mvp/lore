import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { flushOfflineMutationQueue } from "@/src/lib/offlineMutationQueue";

/**
 * Liga TanStack Query ao estado de rede e de foco da app (React Native).
 * - `onlineManager`: refetch quando a rede voltar (`refetchOnReconnect` no queryClient).
 * - `focusManager`: `refetchOnWindowFocus` passa a refletir app em primeiro plano.
 */
export function OnlineManagerBridge() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        setOnline(state.isConnected ?? false);
      })
    );

    focusManager.setEventListener((handleFocus) => {
      const sub = AppState.addEventListener("change", (status) => {
        handleFocus(status === "active");
      });
      return () => sub.remove();
    });

    return () => {
      onlineManager.setEventListener(() => () => {});
      focusManager.setEventListener(() => () => {});
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const unsub = NetInfo.addEventListener((s) => {
      if (s.isConnected) void flushOfflineMutationQueue();
    });
    void flushOfflineMutationQueue();
    return () => {
      unsub();
    };
  }, []);

  return null;
}
