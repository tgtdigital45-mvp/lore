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

export default function MedicationNameScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { draft, setDraft } = useMedicationWizard();

  const name = draft.name;
  const trimmed = name.trim();
  const canNext = trimmed.length > 0;

  const goNext = () => {
    if (!canNext) return;
    Keyboard.dismiss();
    setDraft({ name: trimmed });
    router.push("/(tabs)/health/medications/type" as Href);
  };

  return (
    <ResponsiveScreen variant="tabGradient">
      <KeyboardAccessoryDone label={canNext ? "Seguinte" : "Concluir"} onPress={() => canNext && goNext()} />
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
            Novo medicamento
          </Text>
        </View>
        <CircleChromeButton accessibilityLabel="Fechar" onPress={() => router.dismissAll()}>
          <FontAwesome name="times" size={20} color={theme.colors.text.primary} />
        </CircleChromeButton>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <MedicationWizardStepBadge step={1} theme={theme} />
        <MedicationWizardHero variant="name" theme={theme} />

        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colors.text.primary,
            marginTop: theme.spacing.sm,
          }}
        >
          Como se chama o medicamento?
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
          Use o nome na embalagem ou bula. Pode editar o nome de exibição mais à frente.
        </Text>

        <TextInput
          value={name}
          onChangeText={(t) => setDraft({ name: t })}
          placeholder="Ex.: Paracetamol 500 mg"
          placeholderTextColor={theme.colors.text.tertiary}
          autoCapitalize="sentences"
          autoCorrect
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={() => {
            if (canNext) goNext();
            else Keyboard.dismiss();
          }}
          inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
          style={{
            marginTop: theme.spacing.lg,
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
          onPress={goNext}
          style={({ pressed }) => ({
            marginTop: theme.spacing.xl,
            backgroundColor: canNext ? IOS_HEALTH.blue : theme.colors.background.tertiary,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            opacity: pressed && canNext ? 0.88 : 1,
          })}
        >
          <Text
            style={[
              theme.typography.headline,
              { color: canNext ? "#FFFFFF" : theme.colors.text.tertiary },
            ]}
          >
            Seguinte
          </Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
