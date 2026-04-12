import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { CommonActions } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";

const PILL_BG = "#FFFFFF";
const ACTIVE_SEGMENT = "#E5E5EA";
const ICON_ACTIVE = IOS_HEALTH.blue;
const ICON_IDLE = "#000000";

export function FloatingPillTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index];
  const routeName = current?.name ?? "";

  const resumoActive = routeName === "index";
  const examesActive = routeName === "exams";
  const buscaContext =
    routeName === "health" || routeName === "diary" || routeName === "agent" || routeName === "treatment";

  return (
    <View
      pointerEvents="box-none"
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
              navigation.navigate("exams" as never);
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
    backgroundColor: "transparent",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: PILL_BG,
    borderRadius: 28,
    padding: 4,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 24,
    minWidth: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 0.2,
  },
  searchOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PILL_BG,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
});
