import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import "react-native-reanimated";

import { AuthProvider } from "@/src/auth/AuthContext";
import { queryClient } from "@/src/lib/queryClient";
import { PatientProvider } from "@/src/patient/PatientContext";
import { darkTheme, lightTheme } from "@/src/theme/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PatientProvider>
            <RootLayoutNav />
          </PatientProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const t = colorScheme === "dark" ? darkTheme : lightTheme;
  const navTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const merged = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: t.colors.background.primary,
      card: t.colors.background.secondary,
      text: t.colors.text.primary,
      border: t.colors.border.divider,
      primary: t.colors.semantic.treatment,
    },
  };

  return (
    <ThemeProvider value={merged}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Entrar", headerShown: true }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: "Cadastro", presentation: "modal", headerShown: true }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
