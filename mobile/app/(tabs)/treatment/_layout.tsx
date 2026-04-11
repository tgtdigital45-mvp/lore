import { Stack } from "expo-router";

export default function TreatmentStackLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right", animationDuration: 360, contentStyle: { backgroundColor: "transparent" } }}
    />
  );
}
