import { Stack } from "expo-router";
import { MedicationWizardProvider } from "@/src/medications/MedicationWizardContext";

const nativeStackScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  animation: "ios_from_right" as const,
};

export default function MedicationsStackLayout() {
  return (
    <MedicationWizardProvider>
      <Stack screenOptions={nativeStackScreenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="name" />
        <Stack.Screen name="type" />
        <Stack.Screen name="dosage" />
        <Stack.Screen name="shape" />
        <Stack.Screen name="color" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="review" />
        <Stack.Screen name="detail" />
      </Stack>
    </MedicationWizardProvider>
  );
}
