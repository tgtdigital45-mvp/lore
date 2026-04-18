import { Stack } from "expo-router";

const nativeStackScreenOptions = {
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
  animation: "ios_from_right" as const,
  contentStyle: { backgroundColor: "transparent" },
};

export default function ExamsLayout() {
  return (
    <Stack screenOptions={nativeStackScreenOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: "Detalhes",
          headerBackTitle: "Exames",
          headerTintColor: "#007AFF",
          headerShadowVisible: false,
          // Evita sair da tela ao rolar (gesto de voltar / full-screen pop).
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </Stack>
  );
}
