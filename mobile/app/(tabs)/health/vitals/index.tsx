import { useCallback, useMemo, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CategoryMoreSection } from "@/src/health/components/CategoryMoreSection";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { VITAL_HUB_META, VITAL_HUB_ORDER } from "@/src/health/vitalsConfig";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { usePinnedCategoryShortcut } from "@/src/hooks/usePinnedCategoryShortcut";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useVitalLogs } from "@/src/hooks/useVitalLogs";
import type { VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

function formatVitalPreview(row: VitalLogRow): string {
  if (row.vital_type === "blood_pressure") {
    if (row.value_systolic != null && row.value_diastolic != null) {
      return `${row.value_systolic}/${row.value_diastolic} mmHg`;
    }
  }
  if (row.value_numeric != null) {
    const v = row.value_numeric;
    if (row.vital_type === "temperature") return `${v.toFixed(1)} °C`;
    if (row.vital_type === "weight") return `${v.toFixed(1)} kg`;
    if (row.vital_type === "heart_rate") return `${Math.round(v)} bpm`;
    if (row.vital_type === "glucose") return `${Math.round(v)} mg/dL`;
    if (row.vital_type === "spo2") return `${Math.round(v)} %`;
  }
  return "—";
}

function shortLoggedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function VitalsHubScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { logs, loading, refresh } = useVitalLogs(patient);
  const { pinned, toggle, ready: pinReady } = usePinnedCategoryShortcut("vitals");

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const latestByType = useMemo(() => {
    const map = new Map<VitalType, VitalLogRow>();
    for (const row of logs) {
      if (!map.has(row.vital_type)) map.set(row.vital_type, row);
    }
    return map;
  }, [logs]);

  const hasAnyLog = latestByType.size > 0;

  const typesWithData = useMemo(
    () => VITAL_HUB_ORDER.filter((k) => latestByType.has(k)),
    [latestByType]
  );

  function openType(t: VitalType) {
    router.push(`/(tabs)/health/vitals/${t}` as Href);
  }

  function tintForMeta(accent: (typeof VITAL_HUB_META)[VitalType]["accent"]) {
    return accent === "respiratory"
      ? theme.colors.semantic.respiratory
      : accent === "treatment"
        ? theme.colors.semantic.treatment
        : theme.colors.semantic.vitals;
  }

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
          Sinais vitais
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {!patient ? (
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
            Complete o cadastro do paciente para registrar medições.
          </Text>
        ) : loading ? (
          <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: theme.spacing.xl }} />
        ) : (
          <>
            {/* 1 — Resumo: último valor por tipo */}
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
                Resumo
              </Text>
              {!hasAnyLog ? (
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                  Ainda não há registros. Escolha um tipo abaixo: em cada um há o gráfico, o botão + para nova medição daquele sinal e o
                  histórico abaixo do gráfico.
                </Text>
              ) : (
                typesWithData.map((key, idx) => {
                  const row = latestByType.get(key)!;
                  const m = VITAL_HUB_META[key];
                  const tint = tintForMeta(m.accent);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => openType(key)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: theme.spacing.sm,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: IOS_HEALTH.separator,
                        opacity: pressed ? 0.88 : 1,
                      })}
                    >
                      <FontAwesome name={m.icon as ComponentProps<typeof FontAwesome>["name"]} size={18} color={tint} />
                      <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{m.title}</Text>
                        <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 }}>
                          {formatVitalPreview(row)} · {shortLoggedAt(row.logged_at)}
                        </Text>
                      </View>
                      <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* 2 — Tipos de medição */}
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
              Tipos de medição
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.md, fontSize: 13 }]}>
              Cada tipo é independente: só mostra dados daquele sinal. Abra um tipo para ver o gráfico, usar o + para nova medição (por
              exemplo febre em temperatura) e o histórico logo abaixo do gráfico.
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, justifyContent: "space-between" }}>
              {VITAL_HUB_ORDER.map((key) => {
                const m = VITAL_HUB_META[key];
                const tint = tintForMeta(m.accent);
                return (
                  <Pressable
                    key={key}
                    onPress={() => openType(key)}
                    style={({ pressed }) => ({
                      width: "47%",
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: IOS_HEALTH.groupedListRadius,
                      padding: theme.spacing.md,
                      minHeight: 120,
                      borderWidth: 1,
                      borderColor: theme.colors.border.divider,
                      opacity: pressed ? 0.92 : 1,
                      ...IOS_HEALTH.shadow.card,
                    })}
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
                    <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginTop: 4 }} numberOfLines={2}>
                      {m.subtitle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 3 — Sobre */}
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                ...IOS_HEALTH.shadow.card,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 112,
                  borderRadius: theme.radius.md,
                  backgroundColor: "#1a0a14",
                  marginBottom: theme.spacing.md,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="heartbeat" size={40} color={theme.colors.semantic.vitals} />
              </View>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sobre sinais vitais</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Registrar com regularidade ajuda a perceber alterações cedo e a partilhar dados objetivos com a equipa de saúde. Os gráficos
                mostram tendências; não substituem avaliação clínica.
              </Text>
            </View>

            {/* 4 — Mais */}
            {patient && pinReady ? (
              <CategoryMoreSection
                theme={theme}
                pinned={pinned}
                onTogglePin={() => void toggle()}
                onExportPdf={() => router.push("/reports" as Href)}
                onOptionsPress={() => Alert.alert("Opções", "Preferências de sinais vitais em breve.")}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </ResponsiveScreen>
  );
}
