import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { selfCareTipsForGreen } from "@/src/triage/SelfCareRecommendations";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SelfCareModal({ visible, onClose }: Props) {
  const { theme } = useAppTheme();
  const tips = selfCareTipsForGreen();
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          padding: theme.spacing.md,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.lg,
            borderWidth: 2,
            borderColor: theme.colors.semantic.treatment,
            maxHeight: "80%",
          }}
        >
          <Text style={[theme.typography.title2, { color: theme.colors.semantic.treatment }]}>Autocuidado</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Sintomas leves — sugestões imediatas:
          </Text>
          <ScrollView style={{ marginTop: theme.spacing.md }} showsVerticalScrollIndicator={false}>
            {tips.map((t, i) => (
              <Text
                key={i}
                style={[theme.typography.body, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}
              >
                • {t}
              </Text>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.semantic.treatment,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: "center",
            }}
          >
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Continuar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
