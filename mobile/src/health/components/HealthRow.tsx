import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import type { AppTheme } from "@/src/theme/theme";

type IconName = ComponentProps<typeof FontAwesome>["name"];

type Props = {
  theme: AppTheme;
  icon: IconName;
  iconTint: string;
  title: string;
  subtitle?: string;
  value?: string;
  showDivider?: boolean;
  onPress?: () => void;
};

export function HealthRow({
  theme,
  icon,
  iconTint,
  title,
  subtitle,
  value,
  showDivider,
  onPress,
}: Props) {
  const inner = (
    <>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconTint + "22",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FontAwesome name={icon} size={18} color={iconTint} />
      </View>
      <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
        <Text style={[theme.typography.body, { color: theme.colors.text.primary }]}>{title}</Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              color: theme.colors.text.secondary,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[theme.typography.headline, { color: theme.colors.text.secondary }]}>{value}</Text>
      ) : null}
      <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} style={{ marginLeft: theme.spacing.sm }} />
    </>
  );

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: showDivider ? 1 : 0,
    borderBottomColor: theme.colors.border.divider,
  };

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [rowStyle, pressed && { opacity: 0.65 }]}>
        {inner}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{inner}</View>;
}
