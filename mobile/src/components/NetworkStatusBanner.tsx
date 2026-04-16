import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/hooks/useAppTheme";

/**
 * Faixa discreta quando não há conexão (modo avião / rede indisponível).
 * Web: NetInfo pode reportar "unknown"; só mostramos quando explicitamente offline.
 */
export function NetworkStatusBanner() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined" || typeof navigator === "undefined") return;
      const online = () => setOffline(false);
      const offlineFn = () => setOffline(true);
      window.addEventListener("online", online);
      window.addEventListener("offline", offlineFn);
      setOffline(!navigator.onLine);
      return () => {
        window.removeEventListener("online", online);
        window.removeEventListener("offline", offlineFn);
      };
    }

    const sub = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return () => {
      sub();
    };
  }, []);

  if (!offline) return null;

  return (
    <View
      style={{
        paddingTop: Math.max(insets.top, 8),
        paddingBottom: 8,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: theme.colors.semantic.symptoms,
      }}
      accessibilityRole="alert"
    >
      <Text style={{ color: "#FFFFFF", fontWeight: "700", textAlign: "center", fontSize: 13 }}>
        Sem ligação à Internet. Algumas ações podem falhar até voltar a estar online.
      </Text>
    </View>
  );
}
