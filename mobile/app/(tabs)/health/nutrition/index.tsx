import { useCallback, useMemo, memo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  type ListRenderItem,
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
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { usePinnedCategoryShortcut } from "@/src/hooks/usePinnedCategoryShortcut";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useNutritionLogs } from "@/src/hooks/useNutritionLogs";
import type { AppTheme } from "@/src/theme/theme";
import type { NutritionLogRow, NutritionLogType } from "@/src/types/vitalsNutrition";

const RECENT_LOG_LIMIT = 80;

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
    return `${r.quantity ?? 0} copo(s) · ${when}`;
  }
  if (r.log_type === "meal") {
    const parts = [r.meal_name, r.calories != null ? `${r.calories} kcal` : null].filter(Boolean);
    return `${parts.join(" · ")} · ${when}`;
  }
  if (r.log_type === "calories" && r.calories != null) return `${r.calories} kcal · ${when}`;
  if (r.log_type === "appetite" && r.appetite_level != null) return `${r.appetite_level}/10 · ${when}`;
  return when;
}

function hasAnyTodaySummary(t: {
  water: number;
  coffee: number;
  kcal: number;
  meals: number;
  appetite: number | null;
}): boolean {
  return t.water > 0 || t.coffee > 0 || t.kcal > 0 || t.meals > 0 || t.appetite != null;
}

/** Linha memoizada — evita re-renders durante o gesto de voltar do stack (60fps). */
const NutritionHistoryRow = memo(function NutritionHistoryRow({
  item,
  theme,
  isLast,
  onDelete,
}: {
  item: NutritionLogRow;
  theme: AppTheme;
  isLast: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background.primary,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: IOS_HEALTH.separator,
        marginBottom: isLast ? theme.spacing.lg : 0,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{TYPE_PT[item.log_type]}</Text>
        <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>{lineForRow(item)}</Text>
        {item.notes ? (
          <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginTop: 6 }} numberOfLines={4}>
            {item.notes}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={() => onDelete(item.id)} hitSlop={12} accessibilityLabel="Eliminar registo">
        <FontAwesome name="trash-o" size={18} color={theme.colors.text.tertiary} />
      </Pressable>
    </View>
  );
});

function NutritionHistoryEmpty({ theme }: { theme: AppTheme }) {
  return (
    <View style={{ padding: theme.spacing.lg, alignItems: "center", backgroundColor: theme.colors.background.primary }}>
      <FontAwesome name="history" size={28} color={theme.colors.text.tertiary} />
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: "center" }]}>
        Sem registos ainda.
      </Text>
      <Text style={{ fontSize: 13, color: theme.colors.text.tertiary, marginTop: 6, textAlign: "center" }}>
        Toque em «Novo» ou em «Adicionar registo» para começar.
      </Text>
    </View>
  );
}

export default function NutritionHomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { logs, loading, refresh, deleteLog } = useNutritionLogs(patient);
  const { pinned, toggle, ready: pinReady } = usePinnedCategoryShortcut("nutrition");

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

  const recentLogs = useMemo(() => logs.slice(0, RECENT_LOG_LIMIT), [logs]);

  const openLog = () => router.push("/(tabs)/health/nutrition/log" as Href);

  const confirmDelete = useCallback(
    (id: string) => {
      Alert.alert("Eliminar", "Remover este registo?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => void deleteLog(id) },
      ]);
    },
    [deleteLog]
  );

  const renderHistoryItem = useCallback<ListRenderItem<NutritionLogRow>>(
    ({ item, index }) => (
      <NutritionHistoryRow
        item={item}
        theme={theme}
        isLast={index === recentLogs.length - 1}
        onDelete={confirmDelete}
      />
    ),
    [theme, recentLogs.length, confirmDelete]
  );

  const historyEmpty = useMemo(
    () => (
      <View
        style={{
          backgroundColor: theme.colors.background.primary,
          borderRadius: IOS_HEALTH.groupedListRadius,
          overflow: "hidden",
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border.divider,
          ...IOS_HEALTH.shadow.card,
        }}
      >
        <NutritionHistoryEmpty theme={theme} />
      </View>
    ),
    [theme]
  );

  const listHeader = useMemo(
    () => (
      <>
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
            Resumo de hoje
          </Text>
          {!hasAnyTodaySummary(today) ? (
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              Ainda não há registos hoje. Use «Novo» ou o cartão abaixo para adicionar água, refeições ou apetite.
            </Text>
          ) : (
            <>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Água: {today.water} copo(s)</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>Café: {today.coffee}</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>Refeições: {today.meals}</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                Calorias (refeições + registo): {today.kcal} kcal
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                Apetite (último): {today.appetite != null ? `${today.appetite}/10` : "—"}
              </Text>
            </>
          )}
        </View>

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Novo registo</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.md, fontSize: 13 }]}>
          Registe tomas de água, café, refeições, calorias ou apetite. O histórico recente aparece abaixo.
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            overflow: "hidden",
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border.divider,
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Pressable
            onPress={openLog}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              padding: theme.spacing.md,
              gap: theme.spacing.md,
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.colors.semantic.nutrition,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name="cutlery" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Adicionar registo</Text>
              <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>Abrir formulário de nutrição</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
          </Pressable>
        </View>

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
          Histórico recente
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.md, fontSize: 13 }]}>
          Até {RECENT_LOG_LIMIT} entradas mais recentes. Toque no caixote do lixo para eliminar.
        </Text>
      </>
    ),
    [theme, today, openLog]
  );

  const listFooter = useMemo(
    () => (
      <>
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            ...IOS_HEALTH.shadow.card,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 112,
              borderRadius: theme.radius.md,
              backgroundColor: "#1a1208",
              marginBottom: theme.spacing.md,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome name="cutlery" size={40} color={theme.colors.semantic.nutrition} />
          </View>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sobre nutrição</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Um registo simples de hábitos ajuda a perceber padrões e a partilhar informação útil com a equipa de saúde. Não substitui
            orientação nutricional ou médica.
          </Text>
        </View>

        {patient && pinReady ? (
          <CategoryMoreSection
            theme={theme}
            pinned={pinned}
            onTogglePin={() => void toggle()}
            onExportPdf={() => router.push("/reports" as Href)}
            onOptionsPress={() => Alert.alert("Opções", "Preferências de nutrição em breve.")}
          />
        ) : null}
      </>
    ),
    [theme, patient, pinReady, pinned, toggle, router]
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
          Nutrição
        </Text>
        <Pressable onPress={openLog} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ minWidth: 48, alignItems: "flex-end" }}>
          <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600", fontSize: 16 }}>Novo</Text>
        </Pressable>
      </View>

      {!patient ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: "transparent" }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.xl * 2,
          }}
        >
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
            Complete o cadastro do paciente para registar hábitos alimentares.
          </Text>
        </ScrollView>
      ) : loading ? (
        <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: theme.spacing.xl }} />
      ) : (
        <FlatList
          data={recentLogs}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={historyEmpty}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.xl * 2,
          }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          extraData={recentLogs.length}
          style={{ flex: 1 }}
        />
      )}
    </ResponsiveScreen>
  );
}
