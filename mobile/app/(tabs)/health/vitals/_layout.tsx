import { Stack } from "expo-router";

export default function VitalsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", animationDuration: 360 }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
    </Stack>
  );
}
