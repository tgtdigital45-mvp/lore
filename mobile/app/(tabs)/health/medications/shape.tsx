import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
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
import { ShapeGrid } from "@/src/medications/components/ShapeGrid";
import { PillPreview } from "@/src/medications/components/PillPreview";
import type { MedicationShapeId } from "@/src/medications/types";

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

export default function MedicationShapeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { draft, setDraft } = useMedicationWizard();
  const { width } = useWindowDimensions();
  const cellSize = Math.min(76, (width - theme.spacing.lg * 2 - theme.spacing.md * 3) / 4);

  const displayName = draft.name.trim() || "Medicamento";
  const subtitle = formatDosageLine(draft);

  const [selectedId, setSelectedId] = useState<MedicationShapeId | null>(draft.shapeId);
  const canNext = selectedId !== null;

  const preview = useMemo(
    () => ({
      left: draft.colorLeft,
      right: draft.colorRight,
      bg: draft.colorBg,
    }),
    [draft.colorBg, draft.colorLeft, draft.colorRight]
  );

  const next = () => {
    if (selectedId) setDraft({ shapeId: selectedId });
    router.push("/(tabs)/health/medications/color" as Href);
  };

  const skip = () => {
    setDraft({ shapeId: null });
    router.push("/(tabs)/health/medications/color" as Href);
  };

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
        <MedicationWizardStepBadge step={4} theme={theme} />
        <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
          <PillPreview colorLeft={preview.left} colorRight={preview.right} colorBg={preview.bg} size={100} />
        </View>

        <View style={{ marginTop: theme.spacing.lg }}>
          <ShapeGrid selectedId={selectedId} onSelect={setSelectedId} cellSize={cellSize} />
        </View>

        <Pressable
          disabled={!canNext}
          onPress={next}
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

        <Pressable
          onPress={skip}
          style={({ pressed }) => ({
            marginTop: theme.spacing.md,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            borderWidth: 1,
            borderColor: IOS_HEALTH.separator,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Ignorar</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
