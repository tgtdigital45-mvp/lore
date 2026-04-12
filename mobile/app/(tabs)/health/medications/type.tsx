import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useMedicationWizard } from "@/src/medications/MedicationWizardContext";
import { MedicationWizardStepBadge } from "@/src/medications/components/MedicationWizardStepBadge";

const FORMAS_COMUNS = ["Cápsula", "Comprimido", "Líquido", "Tópico"] as const;
const MAIS_FORMAS = ["Adesivo", "Creme", "Injetável", "Spray", "Dispositivo", "Outro"] as const;

export default function MedicationTypeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { draft, setDraft } = useMedicationWizard();
  const displayName = draft.name.trim() || "Medicamento";

  const [selected, setSelected] = useState<string | null>(draft.form);
  const canNext = selected !== null;

  const finish = useCallback(() => {
    if (!selected) return;
    setDraft({ form: selected });
    router.push("/(tabs)/health/medications/dosage" as Href);
  }, [router, selected, setDraft]);

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
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: theme.colors.text.primary,
              letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
        </View>
        <CircleChromeButton accessibilityLabel="Fechar" onPress={() => router.replace("/(tabs)/health/medications" as Href)}>
          <FontAwesome name="times" size={20} color={theme.colors.text.primary} />
        </CircleChromeButton>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
      >
        <MedicationWizardStepBadge step={2} theme={theme} />
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: theme.colors.text.primary,
            marginTop: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
          }}
        >
          Escolha o tipo de medicamento
        </Text>

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
          Formas comuns
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            overflow: "hidden",
            ...IOS_HEALTH.shadow.card,
          }}
        >
          {FORMAS_COMUNS.map((label, i) => (
            <Pressable
              key={label}
              onPress={() => setSelected(label)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                borderBottomWidth: i < FORMAS_COMUNS.length - 1 ? 1 : 0,
                borderBottomColor: IOS_HEALTH.separator,
                backgroundColor: pressed ? theme.colors.background.secondary : theme.colors.background.primary,
              })}
            >
              <Text style={[theme.typography.body, { flex: 1, fontWeight: "600", color: theme.colors.text.primary }]}>
                {label}
              </Text>
              {selected === label ? (
                <FontAwesome name="check" size={18} color={IOS_HEALTH.blue} />
              ) : null}
            </Pressable>
          ))}
        </View>

        <Text
          style={[
            theme.typography.title2,
            { color: theme.colors.text.primary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
          ]}
        >
          Mais formas
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            overflow: "hidden",
            ...IOS_HEALTH.shadow.card,
          }}
        >
          {MAIS_FORMAS.map((label, i) => (
            <Pressable
              key={label}
              onPress={() => setSelected(label)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                borderBottomWidth: i < MAIS_FORMAS.length - 1 ? 1 : 0,
                borderBottomColor: IOS_HEALTH.separator,
                backgroundColor: pressed ? theme.colors.background.secondary : theme.colors.background.primary,
              })}
            >
              <Text style={[theme.typography.body, { flex: 1, fontWeight: "600", color: theme.colors.text.primary }]}>
                {label}
              </Text>
              {selected === label ? (
                <FontAwesome name="check" size={18} color={IOS_HEALTH.blue} />
              ) : null}
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={!canNext}
          onPress={finish}
          style={({ pressed }) => ({
            marginTop: theme.spacing.xl,
            backgroundColor: canNext ? IOS_HEALTH.blue : theme.colors.background.tertiary,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            opacity: pressed && canNext ? 0.88 : 1,
          })}
        >
          <Text style={[theme.typography.headline, { color: canNext ? "#FFFFFF" : theme.colors.text.tertiary }]}>
            Seguinte
          </Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
