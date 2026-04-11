import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useState } from "react";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import type { ScheduleItem } from "@/src/medications/types";
import { useAppTheme } from "@/src/hooks/useAppTheme";

type Props = {
  item: ScheduleItem;
  onChange: (next: ScheduleItem) => void;
  onRemove: () => void;
  doseLabel?: string;
  showRemove?: boolean;
};

export function ScheduleRow({
  item,
  onChange,
  onRemove,
  doseLabel = "1 aplicação",
  showRemove = true,
}: Props) {
  const { theme } = useAppTheme();
  const [showAndroid, setShowAndroid] = useState(false);

  const d = new Date();
  d.setHours(item.hours, item.minutes, 0, 0);
  const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const onPick = (_: unknown, date?: Date) => {
    if (Platform.OS === "android") setShowAndroid(false);
    if (!date) return;
    onChange({
      ...item,
      hours: date.getHours(),
      minutes: date.getMinutes(),
    });
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: IOS_HEALTH.separator,
      }}
    >
      {showRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityLabel="Remover horário"
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: IOS_HEALTH.destructive,
            alignItems: "center",
            justifyContent: "center",
            marginRight: theme.spacing.sm,
          }}
        >
          <FontAwesome name="minus" size={12} color="#FFF" />
        </Pressable>
      ) : (
        <View style={{ width: 28, marginRight: theme.spacing.sm }} />
      )}

      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-start" }}>
        {Platform.OS === "ios" ? (
          <DateTimePicker value={d} mode="time" display="compact" onChange={onPick} />
        ) : (
          <>
            <Pressable
              onPress={() => setShowAndroid(true)}
              style={{
                backgroundColor: theme.colors.background.tertiary,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: IOS_HEALTH.pillButtonRadius,
              }}
            >
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{timeStr}</Text>
            </Pressable>
            {showAndroid ? (
              <DateTimePicker value={d} mode="time" display="default" onChange={onPick} />
            ) : null}
          </>
        )}
      </View>

      <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600", maxWidth: "38%" }} numberOfLines={1}>
        {doseLabel}
      </Text>
    </View>
  );
}
