import { Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AppTheme } from "@/src/theme/theme";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";

type Props = {
  theme: AppTheme;
  pinned: boolean;
  onTogglePin: () => void;
  onExportPdf: () => void;
  onOptionsPress?: () => void;
  optionsLabel?: string;
};

/**
 * Bloco «Mais» alinhado ao padrão da aba Medicamentos: fixar no Resumo, PDF, opções.
 */
export function CategoryMoreSection({
  theme,
  pinned,
  onTogglePin,
  onExportPdf,
  onOptionsPress,
  optionsLabel = "Opções",
}: Props) {
  return (
    <>
      <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Mais</Text>

      <View
        style={{
          backgroundColor: theme.colors.background.primary,
          borderRadius: IOS_HEALTH.groupedListRadius,
          overflow: "hidden",
          marginBottom: theme.spacing.lg,
          ...IOS_HEALTH.shadow.card,
        }}
      >
        <Pressable
          onPress={onTogglePin}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: theme.spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: IOS_HEALTH.separator,
          }}
        >
          <Text style={[theme.typography.body, { color: theme.colors.text.primary }]}>
            {pinned ? "Desafixar do Resumo" : "Fixar no Resumo"}
          </Text>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: theme.colors.background.tertiary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome name={pinned ? "minus" : "plus"} size={10} color={theme.colors.text.tertiary} />
          </View>
        </Pressable>
        <Text
          style={{
            fontSize: 13,
            color: theme.colors.text.secondary,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          }}
        >
          Os tópicos fixados aparecem na parte superior do Resumo.
        </Text>
        <Pressable
          onPress={onExportPdf}
          style={{
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: IOS_HEALTH.separator,
          }}
        >
          <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Exportar PDF</Text>
        </Pressable>
        {onOptionsPress ? (
          <Pressable
            onPress={onOptionsPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: IOS_HEALTH.separator,
            }}
          >
            <Text style={[theme.typography.body, { fontWeight: "600" }]}>{optionsLabel}</Text>
            <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
          </Pressable>
        ) : null}
      </View>
    </>
  );
}
