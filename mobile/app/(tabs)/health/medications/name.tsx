import { Image, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { healthRel } from "@/src/health/referenceImages";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useMedicationWizard } from "@/src/medications/MedicationWizardContext";

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
          justifyContent: "flex-end",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <CircleChromeButton accessibilityLabel="Fechar" onPress={goBack}>
          <FontAwesome name="times" size={20} color={theme.colors.text.primary} />
        </CircleChromeButton>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <Image
          source={healthRel["2"]}
          style={{ width: "100%", height: 200, marginTop: theme.spacing.sm }}
          resizeMode="contain"
          accessibilityLabel="Ilustração de comprimidos"
        />

        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: theme.colors.text.primary,
            marginTop: theme.spacing.lg,
          }}
        >
          Nome do medicamento
        </Text>

        <TextInput
          value={name}
          onChangeText={(t) => setDraft({ name: t })}
          placeholder="Nome do medicamento"
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
