import Constants from "expo-constants";
import { Platform } from "react-native";

/** Expo Go não inclui o binário HealthKit; é preciso build nativo (`npx expo run:ios` ou EAS). */
export function canUseAppleHealthKit(): boolean {
  return Platform.OS === "ios" && Constants.appOwnership !== "expo";
}
