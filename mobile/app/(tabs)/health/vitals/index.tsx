import { useCallback, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { VITAL_HUB_META, VITAL_HUB_ORDER } from "@/src/health/vitalsConfig";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useVitalLogs } from "@/src/hooks/useVitalLogs";
import type { VitalType } from "@/src/types/vitalsNutrition";

export default function VitalsHubScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { loading, refresh } = useVitalLogs(patient);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  function openType(t: VitalType) {
    router.push(`/(tabs)/health/vitals/${t}` as Href);
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <FontAwesome name="chevron-left" size={22} color={theme.colors.semantic.respiratory} />
        </Pressable>
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginLeft: theme.spacing.sm, flex: 1 }]}>
          Sinais vitais
        </Text>
      </View>

      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.md }]}>
        Escolha o tipo de medição. Em cada aba você verá o gráfico, o histórico e poderá adicionar registros com data e hora.
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.semantic.treatment} style={{ marginTop: theme.spacing.xl }} />
      ) : !patient ? (
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Perfil de paciente necessário.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, justifyContent: "space-between" }}>
            {VITAL_HUB_ORDER.map((key) => {
              const m = VITAL_HUB_META[key];
              const tint =
                m.accent === "respiratory"
                  ? theme.colors.semantic.respiratory
                  : m.accent === "treatment"
                    ? theme.colors.semantic.treatment
                    : theme.colors.semantic.vitals;
              return (
                <Pressable
                  key={key}
                  onPress={() => openType(key)}
                  style={{
                    width: "47%",
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.md,
                    minHeight: 120,
                    borderWidth: 1,
                    borderColor: theme.colors.border.divider,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: theme.colors.background.secondary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    <FontAwesome name={m.icon as ComponentProps<typeof FontAwesome>["name"]} size={22} color={tint} />
                  </View>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                    {m.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginTop: 4 }} numberOfLines={1}>
                    {m.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
