import { useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useMedicationWizard } from "@/src/medications/MedicationWizardContext";
import { MedicationWizardHero } from "@/src/medications/components/MedicationWizardHero";
import { MedicationWizardStepBadge } from "@/src/medications/components/MedicationWizardStepBadge";
import { DOSAGE_UNITS } from "@/src/medications/constants";

export default function MedicationDosageScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { draft, setDraft } = useMedicationWizard();
  const displayName = draft.name.trim() || "Medicamento";
  const formLabel = draft.form ?? "";

  const [amount, setAmount] = useState(draft.dosageAmount ?? "");
  const [unit, setUnit] = useState(draft.unit ?? "mg");
  const trimmed = amount.trim();
  const canNext = trimmed.length > 0;

  const subtitle = formLabel ? `${formLabel}` : "";

  const goShape = () => {
    Keyboard.dismiss();
    setDraft({ dosageAmount: trimmed || null, unit });
    router.push("/(tabs)/health/medications/shape" as Href);
  };

  const skip = () => {
    Keyboard.dismiss();
    setDraft({ dosageAmount: null, unit: null });
    router.push("/(tabs)/health/medications/shape" as Href);
  };

  return (
    <ResponsiveScreen variant="tabGradient">
      <KeyboardAccessoryDone label={canNext ? "Seguinte" : "Concluir"} onPress={() => canNext && goShape()} />
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
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 }} numberOfLines={1}>
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <MedicationWizardStepBadge step={3} theme={theme} />
        <MedicationWizardHero variant="dosage" theme={theme} />

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.md }]}>
          Dose e unidade
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
          Indique a quantidade (ex.: 1 ou 0,5) e a unidade que consta na embalagem ou bula.
        </Text>

        <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
          Quantidade
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Ex.: 1 ou 0,5"
          placeholderTextColor={theme.colors.text.tertiary}
          keyboardType="decimal-pad"
          inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
          style={{
            marginTop: theme.spacing.sm,
            backgroundColor: theme.colors.background.secondary,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.md,
            fontSize: 17,
            color: theme.colors.text.primary,
          }}
        />

        <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
          Escolha a unidade
        </Text>
        <View
          style={{
            marginTop: theme.spacing.sm,
            backgroundColor: theme.colors.background.secondary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            overflow: "hidden",
            ...IOS_HEALTH.shadow.card,
          }}
        >
          {DOSAGE_UNITS.map((u, i) => (
            <Pressable
              key={u}
              onPress={() => {
                Keyboard.dismiss();
                setUnit(u);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                borderBottomWidth: i < DOSAGE_UNITS.length - 1 ? 1 : 0,
                borderBottomColor: IOS_HEALTH.separator,
                backgroundColor: pressed ? theme.colors.background.tertiary : theme.colors.background.secondary,
              })}
            >
              <Text style={[theme.typography.body, { flex: 1, fontWeight: unit === u ? "700" : "500" }]}>{u}</Text>
              {unit === u ? <FontAwesome name="check" size={16} color={IOS_HEALTH.blue} /> : null}
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={!canNext}
          onPress={goShape}
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
