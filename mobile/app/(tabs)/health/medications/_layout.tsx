import { Stack } from "expo-router";
import { MedicationWizardProvider } from "@/src/medications/MedicationWizardContext";

export default function MedicationsStackLayout() {
  return (
    <MedicationWizardProvider>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", animationDuration: 360 }}>
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
