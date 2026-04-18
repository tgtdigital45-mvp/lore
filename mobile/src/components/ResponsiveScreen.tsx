import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarBottomInset } from "@/src/navigation/TabBarInsetContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useResponsiveLayout } from "@/src/hooks/useResponsiveLayout";

/** Gradiente das abas — cobre a tela inteira por trás do conteúdo (sem “quadrado” no centro). */
export const TAB_SCREEN_GRADIENT = ["#FFE8DD", "#F3E8FF", "#F2F2F7"] as const;

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Fundo em gradiente edge-to-edge. Telas fora das abas usam `default`. */
  variant?: "default" | "tabGradient";
  /** Quando um Stack header já cuida do safe-area top; evita padding duplicado e faixa sólida. */
  headerShown?: boolean;
};

/** Envolve telas com largura máxima em tablet e margens seguras em celular. */
export function ResponsiveScreen({ children, style, variant = "default", headerShown = false }: Props) {
  const { theme } = useAppTheme();
  const { isTablet, maxContentWidth, gutter } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const tabBarExtra = useTabBarBottomInset();

  const tabGradient = variant === "tabGradient";

  /** Barra em pílula (tabs): `tabBarExtra` é folga positiva além do safe area inferior. */
  const paddingBottom = insets.bottom + tabBarExtra;

  const innerStyle = {
    flex: 1,
    width: "100%" as const,
    maxWidth: maxContentWidth,
    paddingHorizontal: gutter,
    paddingTop: headerShown ? 0 : insets.top,
    paddingBottom,
    backgroundColor: "transparent" as const,
  };

  if (tabGradient) {
    return (
      <View style={{ flex: 1, width: "100%", alignItems: isTablet ? "center" : "stretch" }}>
        <LinearGradient
          colors={[...TAB_SCREEN_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[innerStyle, style]}>{children}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background.primary,
          alignItems: isTablet ? "center" : "stretch",
        },
        style,
      ]}
    >
      <View style={innerStyle}>{children}</View>
    </View>
  );
}
