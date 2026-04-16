import { ActivityIndicator, Text, View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/src/hooks/useAppTheme";

type Props = {
  /** Optional short message under the spinner */
  message?: string;
  style?: ViewStyle;
};

/**
 * Centro de tela padronizado para estados de carregamento (gate, listas, etc.).
 */
export function ScreenLoading({ message, style }: Props) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background.primary,
        },
        style,
      ]}
    >
      <ActivityIndicator size="large" color={theme.colors.semantic.treatment} />
      {message ? (
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md, textAlign: "center" }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
