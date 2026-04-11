import { Stack } from "expo-router";

export default function ExamsLayout() {
  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        animationDuration: 360,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: "Detalhes",
          headerBackTitle: "Exames",
          headerTintColor: "#007AFF",
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
