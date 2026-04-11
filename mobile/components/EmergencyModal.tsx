import { Modal, Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/src/hooks/useAppTheme";

type Props = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

export function EmergencyModal({ visible, message, onClose }: Props) {
  const { theme } = useAppTheme();
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
            borderColor: theme.colors.semantic.vitals,
          }}
        >
          <Text style={[theme.typography.title2, { color: theme.colors.semantic.vitals }]}>
            Emergência
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>
            {message}
          </Text>
          <Pressable
            onPress={onClose}
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.semantic.vitals,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: "center",
            }}
          >
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Entendi</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
