import { useCallback } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useVitalLogs } from "@/src/hooks/useVitalLogs";
import type { VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

const TYPE_LABEL: Record<VitalType, string> = {
  temperature: "Temperatura",
  heart_rate: "Freq. cardíaca",
  blood_pressure: "Pressão arterial",
  spo2: "SpO2",
  weight: "Peso",
  glucose: "Glicemia",
};

function formatRow(r: VitalLogRow): string {
  const d = new Date(r.logged_at);
  const when = d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  if (r.vital_type === "blood_pressure" && r.value_systolic != null && r.value_diastolic != null) {
    return `${r.value_systolic}/${r.value_diastolic} mmHg · ${when}`;
  }
  if (r.value_numeric != null) {
    const u = r.unit ? ` ${r.unit}` : "";
    return `${r.value_numeric}${u} · ${when}`;
  }
  return when;
}

export default function VitalsListScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { logs, loading, refresh, deleteLog } = useVitalLogs(patient);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

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

  return (
    <ResponsiveScreen variant="tabGradient">
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar">
          <FontAwesome name="chevron-left" size={22} color={theme.colors.semantic.respiratory} />
        </Pressable>
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginLeft: theme.spacing.sm, flex: 1 }]}>
          Sinais vitais
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/health/vitals/log" as Href)}
          style={{ paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
        >
          <Text style={{ color: theme.colors.semantic.treatment, fontWeight: "700" }}>Registrar</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.semantic.treatment} style={{ marginTop: theme.spacing.xl }} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
          showsVerticalScrollIndicator={false}
        >
          {!patient ? (
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Perfil de paciente necessário.</Text>
          ) : logs.length === 0 ? (
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
              Ainda não há registros. Toque em Registrar para adicionar temperatura, pressão, etc.
            </Text>
          ) : (
            logs.map((r) => (
              <View
                key={r.id}
                style={{
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.sm,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                      {TYPE_LABEL[r.vital_type]}
                    </Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>{formatRow(r)}</Text>
                    {r.notes ? (
                      <Text style={{ fontSize: 14, color: theme.colors.text.tertiary, marginTop: 6 }}>{r.notes}</Text>
                    ) : null}
                  </View>
                  <Pressable onPress={() => confirmDelete(r.id)} hitSlop={8}>
                    <FontAwesome name="trash-o" size={18} color={theme.colors.semantic.vitals} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
