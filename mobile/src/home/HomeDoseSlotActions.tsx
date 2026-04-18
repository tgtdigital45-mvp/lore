import { useCallback, useEffect, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AppTheme } from "@/src/theme/theme";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";

type Props = {
  theme: AppTheme;
  slotKey: string;
  /** Instante da janela agendada (para o registo). */
  scheduledWhen: Date;
  markingSlotKey: string | null;
  doseTaken: boolean;
  doseSkipped: boolean;
  onConfirmTaken: (takenTimeIso: string) => Promise<void>;
  onConfirmSkipped: () => Promise<void>;
};

function combineDateAndTime(date: Date, time: Date): Date {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
  return d;
}

export function HomeDoseSlotActions({
  theme,
  slotKey,
  scheduledWhen,
  markingSlotKey,
  doseTaken,
  doseSkipped,
  onConfirmTaken,
  onConfirmSkipped,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [logDate, setLogDate] = useState(scheduledWhen);
  const [logTime, setLogTime] = useState(scheduledWhen);
  const [androidPicker, setAndroidPicker] = useState<"date" | "time" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modalOpen) {
      setLogDate(scheduledWhen);
      setLogTime(scheduledWhen);
    }
  }, [modalOpen, scheduledWhen]);

  const marking = markingSlotKey === slotKey;
  const disabled = markingSlotKey !== null || doseTaken || doseSkipped;

  const saveTaken = useCallback(async () => {
    setSaving(true);
    try {
      const combined = combineDateAndTime(logDate, logTime);
      await onConfirmTaken(combined.toISOString());
      setModalOpen(false);
      setAndroidPicker(null);
    } finally {
      setSaving(false);
    }
  }, [logDate, logTime, onConfirmTaken]);

  if (doseTaken) {
    return (
      <View
        style={{
          marginTop: theme.spacing.md,
          backgroundColor: theme.colors.background.secondary,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.md,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: theme.spacing.sm,
          borderWidth: 1,
          borderColor: theme.colors.text.tertiary,
        }}
      >
        <FontAwesome name="check" size={18} color={theme.colors.semantic.nutrition} />
        <Text style={[theme.typography.headline, { color: theme.colors.text.secondary }]}>Dose registada (tomada)</Text>
      </View>
    );
  }

  if (doseSkipped) {
    return (
      <View
        style={{
          marginTop: theme.spacing.md,
          backgroundColor: theme.colors.background.secondary,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.md,
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.colors.border.divider,
        }}
      >
        <Text style={[theme.typography.headline, { color: theme.colors.text.secondary }]}>Não tomado (registado)</Text>
      </View>
    );
  }

  return (
    <>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <Pressable
          disabled={disabled}
          onPress={() => setModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Tomado — escolher data e hora"
          style={({ pressed }) => [
            {
              flex: 1,
              backgroundColor: theme.colors.semantic.nutrition,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: theme.spacing.sm,
              opacity: disabled ? 0.85 : pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Tomado</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => void onConfirmSkipped()}
          accessibilityRole="button"
          accessibilityLabel="Não tomado"
          style={({ pressed }) => [
            {
              flex: 1,
              backgroundColor: theme.colors.background.tertiary,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
              opacity: disabled ? 0.85 : pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Não tomado</Text>
        </Pressable>
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAndroidPicker(null);
          setModalOpen(false);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: theme.spacing.md }}
          onPress={() => {
            setAndroidPicker(null);
            setModalOpen(false);
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: theme.colors.background.primary, borderRadius: theme.radius.lg, padding: theme.spacing.lg }}>
            <Text style={[theme.typography.title2, { marginBottom: theme.spacing.md, textAlign: "center" }]}>Hora em que tomou</Text>
            {Platform.OS === "ios" ? (
              <>
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>Data</Text>
                <DateTimePicker
                  value={logDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, d) => {
                    if (d) setLogDate(d);
                  }}
                />
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>Hora</Text>
                <DateTimePicker
                  value={logTime}
                  mode="time"
                  display="spinner"
                  onChange={(_, t) => {
                    if (t) setLogTime(t);
                  }}
                />
              </>
            ) : (
              <>
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>Data</Text>
                <Pressable
                  onPress={() => setAndroidPicker("date")}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: IOS_HEALTH.pillButtonRadius,
                    backgroundColor: theme.colors.background.secondary,
                    marginBottom: theme.spacing.md,
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary, fontWeight: "600", textAlign: "center" }}>
                    {logDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>Hora</Text>
                <Pressable
                  onPress={() => setAndroidPicker("time")}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: IOS_HEALTH.pillButtonRadius,
                    backgroundColor: theme.colors.background.secondary,
                    marginBottom: theme.spacing.sm,
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary, fontWeight: "600", textAlign: "center" }}>
                    {logTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Pressable>
                {androidPicker === "date" ? (
                  <DateTimePicker
                    value={logDate}
                    mode="date"
                    display="default"
                    onChange={(event, d) => {
                      setAndroidPicker(null);
                      if (event.type === "dismissed") return;
                      if (d) setLogDate(d);
                    }}
                  />
                ) : null}
                {androidPicker === "time" ? (
                  <DateTimePicker
                    value={logTime}
                    mode="time"
                    display="default"
                    onChange={(event, t) => {
                      setAndroidPicker(null);
                      if (event.type === "dismissed") return;
                      if (t) setLogTime(t);
                    }}
                  />
                ) : null}
              </>
            )}
            <View style={{ flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
              <Pressable
                onPress={() => {
                  setAndroidPicker(null);
                  setModalOpen(false);
                }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: IOS_HEALTH.pillButtonRadius, backgroundColor: theme.colors.background.tertiary, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveTaken()}
                disabled={saving}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: IOS_HEALTH.pillButtonRadius,
                  backgroundColor: IOS_HEALTH.blue,
                  alignItems: "center",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>{saving ? "A guardar…" : "Confirmar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
