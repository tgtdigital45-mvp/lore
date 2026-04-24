import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { CommonActions } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { FLOATING_TAB_BAR_SURFACE_TRANSPARENT } from "@/src/navigation/TabBarInsetContext";

const PILL_BG = "#FFFFFF";
const ACTIVE_SEGMENT = "#E5E5EA";
const ICON_ACTIVE = IOS_HEALTH.blue;
const ICON_IDLE = "#000000";

export function FloatingPillTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index];
  const routeName = current?.name ?? "";

  const resumoActive = routeName === "index";
  const examesActive = routeName === "exams";
  const buscaContext = routeName === "health";

  // Hide the tab bar when deep inside the medication creation wizard
  const pathname = usePathname();
  const isMedicationWizard = pathname.match(/\/medications\/(name|type|shape|color|dosage|schedule|review)$/);

  if (isMedicationWizard) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      collapsable={false}
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: 16,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.pill}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: resumoActive }}
            onPress={() => {
              void Haptics.selectionAsync();
              navigation.navigate("index" as never);
            }}
            style={({ pressed }) => [
              styles.segment,
              resumoActive && { backgroundColor: ACTIVE_SEGMENT },
              pressed && { opacity: 0.85 },
            ]}
          >
            <FontAwesome name="heart" size={22} color={resumoActive ? ICON_ACTIVE : ICON_IDLE} />
            <Text style={[styles.label, { color: resumoActive ? ICON_ACTIVE : ICON_IDLE }]}>Resumo</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: examesActive }}
            onPress={() => {
              void Haptics.selectionAsync();
              navigation.dispatch(
                CommonActions.navigate({
                  name: "exams",
                  params: { screen: "index" },
                })
              );
            }}
            style={({ pressed }) => [
              styles.segment,
              examesActive && { backgroundColor: ACTIVE_SEGMENT },
              pressed && { opacity: 0.85 },
            ]}
          >
            <FontAwesome name="file-text-o" size={20} color={examesActive ? ICON_ACTIVE : ICON_IDLE} />
            <Text style={[styles.label, { color: examesActive ? ICON_ACTIVE : ICON_IDLE }]}>Exames</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          accessibilityState={{ selected: buscaContext }}
          onPress={() => {
            void Haptics.selectionAsync();
            navigation.dispatch(
              CommonActions.navigate({
                name: "health",
                params: { screen: "index" },
              })
            );
          }}
          style={({ pressed }) => [
            styles.searchOrb,
            pressed && { opacity: 0.88 },
            buscaContext && { borderWidth: 2, borderColor: ICON_ACTIVE },
            !buscaContext && { borderWidth: 2, borderColor: "transparent" },
          ]}
        >
          <FontAwesome name="search" size={22} color={buscaContext ? ICON_ACTIVE : ICON_IDLE} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    // Android: elevação maior que cards com elevation para a pílula não ficar “por baixo” do scroll
    elevation: Platform.OS === "android" ? 24 : 10,
    backgroundColor: FLOATING_TAB_BAR_SURFACE_TRANSPARENT,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PILL_BG,
    borderRadius: 999,
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: Platform.OS === "android" ? 12 : 4,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PILL_BG,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: Platform.OS === "android" ? 12 : 4,
  },
});
