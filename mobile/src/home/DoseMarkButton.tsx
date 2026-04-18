import { ActivityIndicator, Pressable, Text } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AppTheme } from "@/src/theme/theme";

export type DoseMarkButtonProps = {
  theme: AppTheme;
  slotKey: string;
  markingSlotKey: string | null;
  confirmedSlotKeys: string[];
  onPress: () => void;
  /** SOS: várias tomadas; não bloqueia o botão após sucesso. */
  repeatDose?: boolean;
};

export function DoseMarkButton({
  theme,
  slotKey,
  markingSlotKey,
  confirmedSlotKeys,
  onPress,
  repeatDose = false,
}: DoseMarkButtonProps) {
  const doseAlreadyRecorded = repeatDose ? false : confirmedSlotKeys.includes(slotKey);
  const marking = markingSlotKey === slotKey;
  const doseMarkButtonDisabled = markingSlotKey !== null || doseAlreadyRecorded;
  return (
    <Pressable
      disabled={doseMarkButtonDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        doseAlreadyRecorded ? "Dose já registada" : marking ? "A registar dose" : "Marcar dose como tomada"
      }
      accessibilityState={{ disabled: doseMarkButtonDisabled }}
      android_ripple={doseMarkButtonDisabled ? undefined : { color: "rgba(255,255,255,0.25)", borderless: false }}
      style={({ pressed }) => [
        {
          marginTop: theme.spacing.md,
          backgroundColor: doseAlreadyRecorded ? theme.colors.background.secondary : theme.colors.semantic.nutrition,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: theme.spacing.sm,
          borderWidth: doseAlreadyRecorded ? 1 : 0,
          borderColor: doseAlreadyRecorded ? theme.colors.text.tertiary : "transparent",
        },
        !doseMarkButtonDisabled && pressed ? { opacity: 0.88 } : null,
        doseMarkButtonDisabled && !doseAlreadyRecorded ? { opacity: 0.85 } : null,
      ]}
    >
      {marking ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : doseAlreadyRecorded ? (
        <FontAwesome name="check" size={18} color={theme.colors.semantic.nutrition} />
      ) : null}
      <Text
        style={[
          theme.typography.headline,
          {
            color: doseAlreadyRecorded ? theme.colors.text.secondary : "#FFFFFF",
          },
        ]}
      >
        {doseAlreadyRecorded ? "Dose já registada" : marking ? "A registar…" : "Marcar como tomado"}
      </Text>
    </Pressable>
  );
}
