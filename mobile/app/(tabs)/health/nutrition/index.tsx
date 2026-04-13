import { useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useNutritionLogs } from "@/src/hooks/useNutritionLogs";
import type { NutritionLogRow, NutritionLogType } from "@/src/types/vitalsNutrition";

function sameLocalDay(iso: string): boolean {
  const a = new Date(iso);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const TYPE_PT: Record<NutritionLogType, string> = {
  water: "Água",
  coffee: "Café",
  meal: "Refeição",
  calories: "Calorias",
  appetite: "Apetite",
};

function lineForRow(r: NutritionLogRow): string {
  const d = new Date(r.logged_at);
  const when = d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  if (r.log_type === "water" || r.log_type === "coffee") {
    return `${r.quantity ?? 0} · ${when}`;
  }
  if (r.log_type === "meal") {
    const parts = [r.meal_name, r.calories != null ? `${r.calories} kcal` : null].filter(Boolean);
    return `${parts.join(" · ")} · ${when}`;
  }
  if (r.log_type === "calories" && r.calories != null) return `${r.calories} kcal · ${when}`;
  if (r.log_type === "appetite" && r.appetite_level != null) return `${r.appetite_level}/10 · ${when}`;
  return when;
}

export default function NutritionHomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { logs, loading, refresh, deleteLog } = useNutritionLogs(patient);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const today = useMemo(() => {
    let water = 0;
    let coffee = 0;
    let kcal = 0;
    let meals = 0;
    let appetite: number | null = null;
    for (const r of logs) {
      if (!sameLocalDay(r.logged_at)) continue;
      if (r.log_type === "water" && r.quantity != null) water += r.quantity;
      if (r.log_type === "coffee" && r.quantity != null) coffee += r.quantity;
      if (r.log_type === "meal") {
        meals += 1;
        if (r.calories != null) kcal += r.calories;
      }
      if (r.log_type === "calories" && r.calories != null) kcal += r.calories;
      if (r.log_type === "appetite" && r.appetite_level != null) appetite = r.appetite_level;
    }
    return { water, coffee, kcal, meals, appetite };
  }, [logs]);

  function confirmDelete(id: string) {
    Alert.alert("Eliminar", "Remover este registro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => void deleteLog(id) },
    ]);
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
        <Pressable onPress={goBack} hitSlop={12}>
          <FontAwesome name="chevron-left" size={22} color={theme.colors.semantic.respiratory} />
        </Pressable>
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginLeft: theme.spacing.sm, flex: 1 }]}>
          Nutrição
        </Text>
        <Pressable onPress={() => router.push("/(tabs)/health/nutrition/log" as Href)}>
          <Text style={{ color: theme.colors.semantic.treatment, fontWeight: "700" }}>Registrar</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.semantic.treatment} style={{ marginTop: theme.spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }} showsVerticalScrollIndicator={false}>
          <View
            style={{
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
              Hoje
            </Text>
            <Text style={{ color: theme.colors.text.secondary }}>Água: {today.water} copo(s)</Text>
            <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>Café: {today.coffee}</Text>
            <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>Refeições: {today.meals}</Text>
            <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>Calorias (refeições + registro): {today.kcal} kcal</Text>
            <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>
              Apetite (último): {today.appetite != null ? `${today.appetite}/10` : "—"}
            </Text>
          </View>

          {!patient ? (
            <Text style={{ color: theme.colors.text.secondary }}>Perfil necessário.</Text>
          ) : logs.length === 0 ? (
            <Text style={{ color: theme.colors.text.secondary }}>Sem registros. Toque em Registrar.</Text>
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
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{TYPE_PT[r.log_type]}</Text>
                    <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>{lineForRow(r)}</Text>
                    {r.notes ? <Text style={{ color: theme.colors.text.tertiary, marginTop: 6 }}>{r.notes}</Text> : null}
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
