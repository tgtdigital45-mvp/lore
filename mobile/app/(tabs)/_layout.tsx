import { Tabs } from "expo-router";
import { FloatingPillTabBar } from "@/src/components/FloatingPillTabBar";
import { FLOATING_TAB_BAR_EXTRA, TabBarInsetContext } from "@/src/navigation/TabBarInsetContext";

export default function TabLayout() {
  return (
    <TabBarInsetContext.Provider value={FLOATING_TAB_BAR_EXTRA}>
      <Tabs
        tabBar={(props) => <FloatingPillTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: { backgroundColor: "transparent" },
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
        <Tabs.Screen name="exams" options={{ title: "Exames" }} />
        <Tabs.Screen name="diary" options={{ title: "Diário", href: null }} />
        <Tabs.Screen name="agent" options={{ title: "Assistente", href: null }} />
        <Tabs.Screen name="health" options={{ title: "Buscar", href: null }} />
      </Tabs>
    </TabBarInsetContext.Provider>
  );
}
