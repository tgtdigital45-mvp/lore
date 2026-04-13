import "react-native-gesture-handler";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { AuthProvider } from "@/src/auth/AuthContext";
import { AppErrorBoundary } from "@/src/components/AppErrorBoundary";
import { queryClient } from "@/src/lib/queryClient";
import { usePushTokenRegistration } from "@/src/hooks/usePushToken";
import { PatientProvider } from "@/src/patient/PatientContext";
import { usePatientLinkNotificationRoutes } from "@/src/hooks/usePatientLinkNotificationRoutes";
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <PatientProvider>
                  <PushTokenBridge />
                  <RootLayoutNav />
                </PatientProvider>
              </AuthProvider>
            </QueryClientProvider>
          </AppErrorBoundary>
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

function PushTokenBridge() {
  usePushTokenRegistration();
  return null;
}

function RootLayoutNav() {
  usePatientLinkNotificationRoutes();
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
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: t.colors.background.primary },
          animation: "default",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Entrar", headerShown: true }} />
        <Stack.Screen name="auth/callback" options={{ title: "Conectar", headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{
            title: "Cadastro",
            presentation: "formSheet",
            headerShown: true,
            animation: "fade_from_bottom",
            gestureDirection: "vertical",
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="lgpd-consent"
          options={{
            title: "Privacidade",
            presentation: "formSheet",
            headerShown: true,
            animation: "fade_from_bottom",
            gestureDirection: "vertical",
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="calendar"
          options={{ title: "Calendário", headerShown: true, animation: "slide_from_right", animationDuration: 380 }}
        />
        <Stack.Screen
          name="authorizations"
          options={{ title: "Acessos hospitalares", headerShown: true, animation: "slide_from_right", animationDuration: 380 }}
        />
        <Stack.Screen
          name="reports"
          options={{ title: "Relatórios", headerShown: true, animation: "slide_from_right", animationDuration: 380 }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
