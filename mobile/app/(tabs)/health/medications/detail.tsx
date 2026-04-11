import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useMedications } from "@/src/hooks/useMedications";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { cancelMedicationNotifications, scheduleMedicationNotifications } from "@/src/lib/medicationNotifications";
import { supabase } from "@/src/lib/supabase";
import { PillPreview } from "@/src/medications/components/PillPreview";
export default function MedicationDetailScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { medications, refresh } = useMedications();
  const [busy, setBusy] = useState(false);

  const med = useMemo(() => medications.find((m) => m.id === id) ?? null, [id, medications]);

  const remove = useCallback(async () => {
    if (!med) return;
    Alert.alert("Remover medicamento", `Remover ${med.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          await cancelMedicationNotifications(med.id);
          const { error } = await supabase.from("medications").delete().eq("id", med.id);
          setBusy(false);
          if (error) {
            Alert.alert("Erro", error.message);
            return;
          }
          await refresh();
          router.replace("/(tabs)/health/medications" as Href);
        },
      },
    ]);
  }, [med, refresh, router]);

  const togglePin = useCallback(
    async (value: boolean) => {
      if (!med) return;
      setBusy(true);
      const { error } = await supabase.from("medications").update({ pinned: value }).eq("id", med.id);
      if (!error) await refresh();
      setBusy(false);
      if (error) Alert.alert("Erro", error.message);
    },
    [med, refresh]
  );

  if (!med) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <View style={{ padding: 24 }}>
          <Text style={theme.typography.body}>Medicamento não encontrado.</Text>
          <Pressable onPress={goBack} style={{ marginTop: 16 }}>
            <Text style={{ color: IOS_HEALTH.blue }}>Voltar</Text>
          </Pressable>
        </View>
      </ResponsiveScreen>
    );
  }

  const left = med.color_left ?? "#FF3B30";
  const right = med.color_right ?? "#FFADB0";
  const bg = med.color_bg ?? "#007AFF";

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
            letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
          }}
        >
          Detalhes
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}>
        <View style={{ alignItems: "center", marginTop: theme.spacing.md }}>
          <PillPreview colorLeft={left} colorRight={right} colorBg={bg} size={120} />
        </View>

        <Text style={[theme.typography.largeTitle, { textAlign: "center", marginTop: theme.spacing.md }]}>
          {med.display_name?.trim() || med.name}
        </Text>
        <Text style={[theme.typography.body, { textAlign: "center", color: theme.colors.text.secondary, marginTop: 4 }]}>
          {[med.form, med.dosage].filter(Boolean).join(" · ") || "—"}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: theme.spacing.xl,
            backgroundColor: theme.colors.background.secondary,
            padding: theme.spacing.md,
            borderRadius: IOS_HEALTH.groupedListRadius,
          }}
        >
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={theme.typography.headline}>Fixar no resumo</Text>
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>
              Os tópicos fixados aparecem na parte superior do resumo.
            </Text>
          </View>
          <Switch value={Boolean(med.pinned)} onValueChange={togglePin} disabled={busy} />
        </View>

        <Pressable
          onPress={remove}
          disabled={busy}
          style={{
            marginTop: theme.spacing.xl,
            backgroundColor: IOS_HEALTH.destructive,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Remover medicamento</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
