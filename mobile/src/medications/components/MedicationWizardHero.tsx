import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import type { AppTheme } from "@/src/theme/theme";

export type MedicationWizardHeroVariant = "landing" | "name" | "dosage";

type Props = {
  variant: MedicationWizardHeroVariant;
  theme: AppTheme;
};

/**
 * Ilustração do assistente de medicamentos (ícones MDI + gradiente).
 * Substitui screenshots estáticos (health/rel/*.jpeg) por UI coerente e escalável.
 */
export function MedicationWizardHero({ variant, theme }: Props) {
  const accent = IOS_HEALTH.blue;
  const tintBg = `${accent}18`;
  const minH = variant === "landing" ? 188 : variant === "name" ? 148 : 128;

  return (
    <View
      style={{
        width: "100%",
        marginBottom: theme.spacing.sm,
        minHeight: minH,
        borderRadius: IOS_HEALTH.cardRadiusLarge,
        overflow: "hidden",
        ...IOS_HEALTH.shadow.card,
      }}
    >
      <LinearGradient
        colors={[tintBg, theme.colors.background.secondary, theme.colors.background.tertiary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={{
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          justifyContent: "center",
          alignItems: "center",
          minHeight: minH,
        }}
      >
        {variant === "landing" ? (
          <>
            <MaterialCommunityIcons name="pill-multiple" size={72} color={accent} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: theme.spacing.lg }}>
              <View style={{ alignItems: "center", marginHorizontal: theme.spacing.md }}>
                <MaterialCommunityIcons name="calendar-clock" size={26} color={theme.colors.text.secondary} />
                <Text style={{ fontSize: 11, color: theme.colors.text.tertiary, marginTop: 4 }}>Horários</Text>
              </View>
              <View style={{ alignItems: "center", marginHorizontal: theme.spacing.md }}>
                <MaterialCommunityIcons name="bell-ring-outline" size={26} color={theme.colors.text.secondary} />
                <Text style={{ fontSize: 11, color: theme.colors.text.tertiary, marginTop: 4 }}>Lembretes</Text>
              </View>
              <View style={{ alignItems: "center", marginHorizontal: theme.spacing.md }}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={26} color={theme.colors.text.secondary} />
                <Text style={{ fontSize: 11, color: theme.colors.text.tertiary, marginTop: 4 }}>Registo</Text>
              </View>
            </View>
          </>
        ) : null}

        {variant === "name" ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="pill" size={56} color={accent} />
            <View style={{ marginLeft: theme.spacing.md }}>
              <MaterialCommunityIcons name="plus-circle-outline" size={44} color={accent} />
            </View>
          </View>
        ) : null}

        {variant === "dosage" ? (
          <MaterialCommunityIcons name="medication-outline" size={56} color={accent} />
        ) : null}
      </View>
    </View>
  );
}
