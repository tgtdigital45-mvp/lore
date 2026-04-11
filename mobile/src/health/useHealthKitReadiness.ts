import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { canUseAppleHealthKit } from "@/src/health/appleHealthEnv";

/**
 * Apple Health / HealthKit: requer build iOS nativo (não Expo Go).
 * `nativeLinked` indica se o HealthKit está disponível no dispositivo.
 */
export function useHealthKitReadiness() {
  const platformSupported = Platform.OS === "ios";
  const expoGo = Constants.appOwnership === "expo";
  const [nativeLinked, setNativeLinked] = useState(false);

  useEffect(() => {
    if (!canUseAppleHealthKit()) {
      setNativeLinked(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const hk = await import("@kingstinct/react-native-healthkit");
        const ok = hk.isHealthDataAvailable();
        if (!cancelled) setNativeLinked(ok);
      } catch {
        if (!cancelled) setNativeLinked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const message = (() => {
    if (Platform.OS !== "ios") {
      return "No Android, o Health Connect será suportado numa versão futura.";
    }
    if (expoGo) {
      return "No Expo Go o HealthKit não está incluído. Gere um build iOS (por exemplo npx expo run:ios) para ler dados do Apple Saúde.";
    }
    if (!nativeLinked) {
      return "HealthKit não está disponível neste dispositivo.";
    }
    return "Vitais, quedas e eventos de estabilidade podem ser lidos do Apple Saúde e sincronizados com o Onco (Supabase) após autorização.";
  })();

  return {
    platformSupported,
    /** `true` em build nativo iOS com HealthKit disponível (não Expo Go). */
    nativeLinked,
    message,
  };
}
