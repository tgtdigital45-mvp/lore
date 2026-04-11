import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { AppTheme } from "@/src/theme/theme";

type Props = {
  theme: AppTheme;
  title: string;
  children: ReactNode;
  footer?: string;
  /** Fundo do cartão agrupado — no app Saúde as listas são brancas sobre cinza #F2F2F7. */
  surfaceColor?: string;
  marginTop?: number;
};

export function HealthSection({ theme, title, children, footer, surfaceColor, marginTop: mt }: Props) {
  return (
    <View style={{ marginTop: mt ?? theme.spacing.lg }}>
      {title ? (
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            lineHeight: 28,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
            marginLeft: theme.spacing.xs,
          }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: surfaceColor ?? theme.colors.background.secondary,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
      {footer ? (
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: theme.colors.text.tertiary,
            marginTop: theme.spacing.sm,
            marginHorizontal: theme.spacing.xs,
          }}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
