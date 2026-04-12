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
import { ColorPalette } from "@/src/medications/components/ColorPalette";
import { PillPreview } from "@/src/medications/components/PillPreview";
import { PILL_BACKGROUND_COLORS, PILL_HALVES_COLORS } from "@/src/medications/constants";

function formatDosageLine(draft: {
  form: string | null;
  dosageAmount: string | null;
  unit: string | null;
}): string {
  const parts: string[] = [];
  if (draft.form) parts.push(draft.form);
  if (draft.dosageAmount?.trim()) {
    parts.push(`${draft.dosageAmount.trim()}${draft.unit ? ` ${draft.unit}` : ""}`);
  }
  return parts.join(", ");
}

export default function MedicationColorScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { draft, setDraft } = useMedicationWizard();

  const displayName = draft.name.trim() || "Medicamento";
  const subtitle = formatDosageLine(draft);

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
          {subtitle ? (
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <CircleChromeButton accessibilityLabel="Fechar" onPress={() => router.replace("/(tabs)/health/medications" as Href)}>
          <FontAwesome name="times" size={20} color={theme.colors.text.primary} />
        </CircleChromeButton>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
      >
        <MedicationWizardStepBadge step={5} theme={theme} />
        <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
          <PillPreview colorLeft={draft.colorLeft} colorRight={draft.colorRight} colorBg={draft.colorBg} size={140} />
        </View>

        <Text
          style={[
            theme.typography.title2,
            { color: theme.colors.text.primary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
          ]}
        >
          Escolha as cores
        </Text>

        <ColorPalette
          title="Lado esquerdo"
          colors={PILL_HALVES_COLORS}
          selected={draft.colorLeft}
          onSelect={(c) => setDraft({ colorLeft: c })}
        />
        <ColorPalette
          title="Lado direito"
          colors={PILL_HALVES_COLORS}
          selected={draft.colorRight}
          onSelect={(c) => setDraft({ colorRight: c })}
        />
        <ColorPalette
          title="Segundo plano"
          colors={PILL_BACKGROUND_COLORS}
          selected={draft.colorBg}
          onSelect={(c) => setDraft({ colorBg: c })}
          swatchSize={40}
        />

        <Pressable
          onPress={() => router.push("/(tabs)/health/medications/schedule" as Href)}
          style={({ pressed }) => ({
            marginTop: theme.spacing.lg,
            backgroundColor: IOS_HEALTH.blue,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Seguinte</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
