import { useMemo, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";

export default function TreatmentNameWizardScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/treatment/schedule" as Href);
  const params = useLocalSearchParams<{
    kind?: string;
    startDate?: string;
    planned?: string;
    completed?: string;
    infusionIntervalDays?: string;
  }>();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const canNext = useMemo(() => trimmed.length > 0, [trimmed]);

  function next() {
    if (!canNext) return;
    Keyboard.dismiss();
    router.push({
      pathname: "/treatment/details",
      params: {
        kind: params.kind ?? "other",
        startDate: params.startDate ?? "",
        planned: params.planned ?? "",
        completed: params.completed ?? "",
        infusionIntervalDays: params.infusionIntervalDays ?? "",
        protocolName: trimmed,
      },
    } as Href);
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
        <Text style={[theme.typography.headline, { flex: 1, textAlign: "center", color: theme.colors.text.primary }]}>
          Nome do ciclo
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: AC-T, protocolo hospitalar…"
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="sentences"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => {
            Keyboard.dismiss();
            if (name.trim().length > 0) next();
          }}
          style={{
            marginTop: theme.spacing.md,
            backgroundColor: theme.colors.background.secondary,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.md,
            fontSize: 17,
            color: theme.colors.text.primary,
          }}
        />

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
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>Seguinte</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
