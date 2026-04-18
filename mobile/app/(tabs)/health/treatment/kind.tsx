import { Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { labelTreatmentKind } from "@/src/i18n/treatment";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { TREATMENT_HREF } from "@/src/navigation/treatmentRoutes";
import type { TreatmentKind } from "@/src/types/treatment";

const KINDS: TreatmentKind[] = ["chemotherapy", "radiotherapy", "hormone", "immunotherapy", "other"];

export default function TreatmentKindScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack(TREATMENT_HREF.index);

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
          Tipo de tratamento
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
      >
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.md }]}>
          Escolha o tipo de ciclo. Pode alterar detalhes mais tarde.
        </Text>
        {KINDS.map((k) => (
          <Pressable
            key={k}
            onPress={() =>
              router.push({
                pathname: TREATMENT_HREF.schedule,
                params: { kind: k },
              })
            }
            style={({ pressed }) => ({
              marginBottom: theme.spacing.sm,
              backgroundColor: theme.colors.background.primary,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{labelTreatmentKind(k)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ResponsiveScreen>
  );
}
