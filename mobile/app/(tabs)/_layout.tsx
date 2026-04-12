import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { FloatingPillTabBar } from "@/src/components/FloatingPillTabBar";
import { FLOATING_TAB_BAR_EXTRA, TabBarInsetContext } from "@/src/navigation/TabBarInsetContext";
import { darkTheme, lightTheme } from "@/src/theme/theme";

export default function TabLayout() {
  const { session, loading: authLoading } = useAuth();
  const scheme = useColorScheme();
  const sceneBg = scheme === "dark" ? darkTheme.colors.background.primary : lightTheme.colors.background.primary;

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: sceneBg }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <TabBarInsetContext.Provider value={FLOATING_TAB_BAR_EXTRA}>
      <Tabs
        tabBar={(props) => <FloatingPillTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          animation: "fade",
          transitionSpec: {
            animation: "timing",
            config: { duration: 240 },
          },
          sceneStyle: { backgroundColor: sceneBg },
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Resumo" }} />
        <Tabs.Screen name="treatment" options={{ title: "Tratamento", href: null }} />
        <Tabs.Screen name="exams" options={{ title: "Exames" }} />
        <Tabs.Screen name="diary" options={{ title: "Sintomas", href: null }} />
        <Tabs.Screen name="agent" options={{ title: "Assistente", href: null }} />
        <Tabs.Screen name="health" options={{ title: "Buscar", href: null }} />
      </Tabs>
    </TabBarInsetContext.Provider>
  );
}
