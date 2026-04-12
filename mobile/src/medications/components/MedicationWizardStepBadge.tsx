import { Text, View } from "react-native";
import type { AppTheme } from "@/src/theme/theme";

const TOTAL = 7;

type Props = {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  theme: AppTheme;
};

export function MedicationWizardStepBadge({ step, theme }: Props) {
  return (
    <View style={{ marginBottom: theme.spacing.sm }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.4,
          color: theme.colors.text.tertiary,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Passo {step} de {TOTAL}
      </Text>
    </View>
  );
}
