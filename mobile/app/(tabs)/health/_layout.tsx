import { Stack } from "expo-router";

export default function HealthStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 360,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="medications" />
      <Stack.Screen name="vitals" />
      <Stack.Screen name="nutrition" />
    </Stack>
  );
}
