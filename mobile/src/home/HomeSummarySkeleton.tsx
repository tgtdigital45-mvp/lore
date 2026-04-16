import { View } from "react-native";
import type { AppTheme } from "@/src/theme/theme";

type Props = { theme: AppTheme };

function Bar({ theme, h }: { theme: AppTheme; h: number }) {
  return (
    <View
      style={{
        height: h,
        width: "100%",
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.background.tertiary,
        opacity: 0.85,
      }}
    />
  );
}

/** Placeholders do Resumo no primeiro carregamento (evita “salto” de layout). */
export function HomeSummarySkeleton({ theme }: Props) {
  return (
    <View style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.md }}>
      <Bar theme={theme} h={112} />
      <Bar theme={theme} h={72} />
      <Bar theme={theme} h={72} />
      <Bar theme={theme} h={72} />
      <Bar theme={theme} h={96} />
    </View>
  );
}
