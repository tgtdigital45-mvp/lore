import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { LineChart } from "react-native-gifted-charts";
import { OncoCard } from "@/components/OncoCard";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { type TimeframeKey } from "@/src/diary/symptomLogValue";
import { chartLayoutFor, filterVitalLogsForChart } from "@/src/health/vitalsChart";
import {
  FEVER_THRESHOLD_C,
  isVitalType,
  VITAL_HUB_ORDER,
  VITAL_HUB_META,
  VITAL_TAB_SHORT,
} from "@/src/health/vitalsConfig";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useVitalLogs } from "@/src/hooks/useVitalLogs";
import type { VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: "D", label: "D" },
  { key: "S", label: "S" },
  { key: "M", label: "M" },
  { key: "6M", label: "6M" },
  { key: "A", label: "A" },
];

function formatRow(r: VitalLogRow): string {
  const d = new Date(r.logged_at);
  const when = d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const day = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  if (r.vital_type === "blood_pressure" && r.value_systolic != null && r.value_diastolic != null) {
    return `${r.value_systolic}/${r.value_diastolic} mmHg · ${when} · ${day}`;
  }
  if (r.value_numeric != null) {
    const u = r.unit ? ` ${r.unit}` : "";
    return `${r.value_numeric}${u} · ${when} · ${day}`;
  }
  return `${when} · ${day}`;
}

function isFeverRow(r: VitalLogRow): boolean {
  return (
    r.vital_type === "temperature" &&
    r.value_numeric != null &&
    r.value_numeric > FEVER_THRESHOLD_C
  );
}

export default function VitalTypeDetailScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { type: rawType } = useLocalSearchParams<{ type: string }>();
  const goBack = useStackBack("/(tabs)/health/vitals" as Href);
  const { patient } = usePatient();
  const { logs, loading, refresh, deleteLog } = useVitalLogs(patient);

  const vitalType: VitalType | null = isVitalType(rawType) ? rawType : null;

  useEffect(() => {
    if (rawType && !isVitalType(rawType)) {
      router.replace("/(tabs)/health/vitals" as Href);
    }
  }, [rawType, router]);

  const [tf, setTf] = useState<TimeframeKey>("S");

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const meta = vitalType ? VITAL_HUB_META[vitalType] : null;
  const accent =
    meta?.accent === "respiratory"
      ? theme.colors.semantic.respiratory
      : meta?.accent === "treatment"
        ? theme.colors.semantic.treatment
        : theme.colors.semantic.vitals;

  const points = useMemo(() => {
    if (!vitalType) return [];
    return filterVitalLogsForChart(logs, vitalType, tf, Date.now());
  }, [logs, vitalType, tf]);

  const lineData = useMemo(() => {
    return points.map((p) => ({
      value: p.value,
      label: p.label,
      dataPointText: p.dataPointText,
    }));
  }, [points]);

  const layout = useMemo(() => {
    if (!vitalType) return { maxValue: 100, yAxisOffset: 0, noOfSections: 4 };
    return chartLayoutFor(vitalType, points);
  }, [vitalType, points]);

  const hasChart = lineData.length > 0;

  const typeRows = useMemo(() => {
    if (!vitalType) return [];
    return logs
      .filter((r) => r.vital_type === vitalType)
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
  }, [logs, vitalType]);

  const feverInPeriod = vitalType === "temperature" && points.some((p) => p.value > FEVER_THRESHOLD_C);

  function confirmDelete(id: string) {
    Alert.alert("Eliminar registro", "Remover esta medição?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => void deleteLog(id),
      },
    ]);
  }

  function goAdd() {
    if (!vitalType) return;
    router.push(`/(tabs)/health/vitals/log?type=${vitalType}` as Href);
  }

  function switchType(next: VitalType) {
    router.replace(`/(tabs)/health/vitals/${next}` as Href);
  }

  if (!vitalType || !meta) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <ActivityIndicator color={theme.colors.semantic.treatment} style={{ marginTop: theme.spacing.xl }} />
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <FontAwesome name="chevron-left" size={22} color={theme.colors.semantic.respiratory} />
        </Pressable>
        <Text
          style={[theme.typography.title2, { color: theme.colors.text.primary, marginLeft: theme.spacing.sm, flex: 1 }]}
          numberOfLines={1}
        >
          {meta.title}
        </Text>
        <Pressable
          onPress={goAdd}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Novo registro"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.background.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="plus" size={18} color={accent} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.xs, paddingBottom: theme.spacing.sm, paddingRight: theme.spacing.md }}
        style={{ maxHeight: 44, marginBottom: theme.spacing.sm }}
      >
        {VITAL_HUB_ORDER.map((t) => {
          const active = t === vitalType;
          return (
            <Pressable
              key={t}
              onPress={() => switchType(t)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: active ? theme.colors.semantic.treatment : theme.colors.background.secondary,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: active ? "700" : "600",
                  color: active ? "#FFF" : theme.colors.text.primary,
                }}
              >
                {VITAL_TAB_SHORT[t]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.colors.semantic.treatment} style={{ marginTop: theme.spacing.lg }} />
      ) : !patient ? (
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Perfil de paciente necessário.</Text>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
          showsVerticalScrollIndicator={false}
        >
          {vitalType === "temperature" ? (
            <View style={{ marginBottom: theme.spacing.sm }}>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, fontSize: 13 }]}>
                Regra de febre: acima de {String(FEVER_THRESHOLD_C).replace(".", ",")} °C destacamos o registro (a equipe pode ajustar este
                limiar).
              </Text>
            </View>
          ) : null}

          <OncoCard
            style={{
              marginBottom: theme.spacing.md,
              borderWidth: vitalType === "temperature" && feverInPeriod ? 2 : 0,
              borderColor: vitalType === "temperature" && feverInPeriod ? theme.colors.semantic.vitals : undefined,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.colors.background.tertiary,
                borderRadius: theme.radius.md,
                padding: 4,
                marginBottom: theme.spacing.md,
              }}
            >
              {TIMEFRAMES.map((seg) => {
                const active = tf === seg.key;
                return (
                  <Pressable
                    key={seg.key}
                    onPress={() => setTf(seg.key)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: theme.radius.sm,
                      backgroundColor: active ? theme.colors.background.primary : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: active ? "700" : "600",
                        color: active ? theme.colors.text.primary : theme.colors.text.secondary,
                      }}
                    >
                      {seg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {vitalType === "temperature" && feverInPeriod ? (
              <View
                style={{
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: theme.radius.sm,
                  padding: theme.spacing.sm,
                  marginBottom: theme.spacing.sm,
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.semantic.vitals,
                }}
              >
                <Text style={{ fontWeight: "700", color: theme.colors.semantic.vitals, fontSize: 13 }}>Aviso de febre</Text>
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>
                  Há medições acima de {String(FEVER_THRESHOLD_C).replace(".", ",")} °C no período selecionado. Compartilhe com a equipe se
                  tiver dúvidas.
                </Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 11, color: theme.colors.text.secondary, marginBottom: 8 }}>{meta.subtitle}</Text>
            {hasChart ? (
              <LineChart
                data={lineData}
                width={Math.min(Dimensions.get("window").width - theme.spacing.md * 4, 360)}
                height={200}
                color={accent}
                thickness={3}
                spacing={Math.max(20, 280 / Math.max(lineData.length, 1))}
                hideDataPoints={lineData.length > 10}
                yAxisColor={theme.colors.border.divider}
                xAxisColor={theme.colors.border.divider}
                yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.text.secondary, fontSize: 9 }}
                curved
                maxValue={layout.maxValue}
                yAxisOffset={layout.yAxisOffset}
                noOfSections={layout.noOfSections}
                areaChart
                startFillColor={accent}
                endFillColor={accent}
                startOpacity={0.22}
                endOpacity={0.04}
              />
            ) : (
              <Text
                style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center", paddingVertical: theme.spacing.lg }]}
              >
                Sem registros neste período. Toque em + para adicionar.
              </Text>
            )}
          </OncoCard>

          <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Histórico</Text>
          {typeRows.length === 0 ? (
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              Ainda não há medições deste tipo. Use o botão + acima.
            </Text>
          ) : (
            typeRows.map((r) => {
              const fever = isFeverRow(r);
              return (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.sm,
                    borderWidth: fever ? 2 : 0,
                    borderColor: fever ? theme.colors.semantic.vitals : "transparent",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                      {fever ? (
                        <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.semantic.vitals, marginBottom: 4 }}>
                          Febre (acima de {String(FEVER_THRESHOLD_C).replace(".", ",")} °C)
                        </Text>
                      ) : null}
                      <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>{formatRow(r)}</Text>
                      {r.notes ? (
                        <Text style={{ fontSize: 14, color: theme.colors.text.tertiary, marginTop: 6 }}>{r.notes}</Text>
                      ) : null}
                    </View>
                    <Pressable onPress={() => confirmDelete(r.id)} hitSlop={8}>
                      <FontAwesome name="trash-o" size={18} color={theme.colors.semantic.vitals} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
