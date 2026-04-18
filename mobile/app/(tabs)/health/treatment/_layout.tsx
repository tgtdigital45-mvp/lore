import { Stack } from "expo-router";

const nativeStackScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  animation: "ios_from_right" as const,
  contentStyle: { backgroundColor: "transparent" },
};

export default function TreatmentStackLayout() {
  return (
    <Stack screenOptions={nativeStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="kind" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="details" />
      <Stack.Screen name="[cycleId]/index" />
      <Stack.Screen name="[cycleId]/edit" />
      <Stack.Screen name="[cycleId]/checkin" />
      <Stack.Screen name="[cycleId]/infusion/new" />
      <Stack.Screen name="[cycleId]/infusion/[infusionId]" />
    </Stack>
  );
}
