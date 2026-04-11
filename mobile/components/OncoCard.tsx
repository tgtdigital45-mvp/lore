import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/src/hooks/useAppTheme";

export function OncoCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.background.secondary,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
