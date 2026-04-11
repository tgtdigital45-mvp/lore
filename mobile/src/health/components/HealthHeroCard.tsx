import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import type { AppTheme } from "@/src/theme/theme";
import { ActivityRingsDecoration } from "./ActivityRingsDecoration";

type Props = {
  theme: AppTheme;
  title: string;
  subtitle: string;
  footnote: string;
  ringTrackColor: string;
};

export function HealthHeroCard({ theme, title, subtitle, footnote, ringTrackColor }: Props) {
  return (
    <LinearGradient
      colors={[theme.colors.background.secondary, theme.colors.background.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border.divider,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>{title}</Text>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              color: theme.colors.text.secondary,
              marginTop: theme.spacing.sm,
            }}
          >
            {subtitle}
          </Text>
        </View>
        <ActivityRingsDecoration trackColor={ringTrackColor} />
      </View>
      <Text
        style={{
          fontSize: 13,
          lineHeight: 18,
          color: theme.colors.text.tertiary,
          marginTop: theme.spacing.md,
        }}
      >
        {footnote}
      </Text>
    </LinearGradient>
  );
}
