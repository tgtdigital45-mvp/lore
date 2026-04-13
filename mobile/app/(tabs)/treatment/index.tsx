import { useCallback } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { Link, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { labelTreatmentKind } from "@/src/i18n/treatment";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";

function formatDate(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TreatmentIndexScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { cycles, loading, refresh } = useTreatmentCycles(patient);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <ResponsiveScreen variant="tabGradient">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <CircleChromeButton accessibilityLabel="Voltar" onPress={goBack}>
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </CircleChromeButton>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "600",
            color: theme.colors.text.primary,
            letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
          }}
        >
          Tratamento
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 }}
      >
        {!patient ? (
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
            Complete o cadastro do paciente para gerir ciclos.
          </Text>
        ) : loading ? (
          <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: theme.spacing.xl }} />
        ) : (
          <>
            <Pressable
              onPress={() => router.push("/treatment/kind" as Href)}
              style={({ pressed }) => ({
                marginBottom: theme.spacing.md,
                backgroundColor: theme.colors.semantic.treatment,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.radius.md,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Novo ciclo</Text>
            </Pressable>

            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
              Ciclos
            </Text>
            {cycles.length === 0 ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                Nenhum ciclo registrado. Toque em «Novo ciclo» para começar.
              </Text>
            ) : (
              cycles.map((c) => (
                <Link key={c.id} href={`/treatment/${c.id}` as Href} asChild>
                  <Pressable
                    style={({ pressed }) => ({
                      marginBottom: theme.spacing.sm,
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: theme.radius.md,
                      padding: theme.spacing.md,
                      opacity: pressed ? 0.92 : 1,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    })}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{c.protocol_name}</Text>
                        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                          {labelTreatmentKind(c.treatment_kind ?? "chemotherapy")} · {formatDate(c.start_date)}
                        </Text>
                        <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginTop: 4 }]}>
                          {c.status === "active" ? "Ativo" : c.status === "completed" ? "Concluído" : "Suspenso"}
                          {c.planned_sessions != null ? ` · ${c.completed_sessions ?? 0}/${c.planned_sessions} sessões` : ""}
                        </Text>
                      </View>
                      <FontAwesome name="chevron-right" size={16} color={theme.colors.text.tertiary} />
                    </View>
                  </Pressable>
                </Link>
              ))
            )}
          </>
        )}
      </ScrollView>
    </ResponsiveScreen>
  );
}
