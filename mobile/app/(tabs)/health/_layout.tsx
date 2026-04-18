import { Stack } from "expo-router";

const nativeStackScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  animation: "ios_from_right" as const,
  contentStyle: { backgroundColor: "transparent" },
};

export default function HealthStackLayout() {
  return (
    <Stack screenOptions={nativeStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="diary" />
      <Stack.Screen name="education" />
      <Stack.Screen name="medications" />
      <Stack.Screen name="vitals" />
      <Stack.Screen name="nutrition" />
      <Stack.Screen name="treatment" />
    </Stack>
  );
}
