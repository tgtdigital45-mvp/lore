import { Stack } from "expo-router";

const nativeStackScreenOptions = {
  headerShown: false,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  animation: "ios_from_right" as const,
};

export default function NutritionStackLayout() {
  return (
    <Stack screenOptions={nativeStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
    </Stack>
  );
}
