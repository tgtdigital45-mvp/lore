import type { ParamListBase, TabNavigationState } from "@react-navigation/native";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from "@react-navigation/material-top-tabs";
import { Redirect, withLayoutContext } from "expo-router";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { FloatingPillTabBar } from "@/src/components/FloatingPillTabBar";
import {
  FLOATING_TAB_BAR_BOTTOM_CLEARANCE,
  FLOATING_TAB_BAR_SURFACE_TRANSPARENT,
  TabBarInsetContext,
} from "@/src/navigation/TabBarInsetContext";
import { darkTheme, lightTheme } from "@/src/theme/theme";

const TopTabs = createMaterialTopTabNavigator();

const MaterialTopTabsLayout = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof TopTabs.Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(TopTabs.Navigator);

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
    <TabBarInsetContext.Provider value={FLOATING_TAB_BAR_BOTTOM_CLEARANCE}>
      <MaterialTopTabsLayout
        initialRouteName="index"
        tabBarPosition="bottom"
        tabBar={(props) => <FloatingPillTabBar {...props} />}
        screenOptions={{
          swipeEnabled: true,
          animationEnabled: false,
          sceneStyle: { backgroundColor: FLOATING_TAB_BAR_SURFACE_TRANSPARENT },
          tabBarIndicatorStyle: { height: 0 },
          tabBarStyle: {
            backgroundColor: FLOATING_TAB_BAR_SURFACE_TRANSPARENT,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <MaterialTopTabsLayout.Screen name="index" options={{ title: "Resumo" }} />
        <MaterialTopTabsLayout.Screen name="exams" options={{ title: "Exames" }} />
        <MaterialTopTabsLayout.Screen name="health" options={{ title: "Buscar" }} />
      </MaterialTopTabsLayout>
    </TabBarInsetContext.Provider>
  );
}
