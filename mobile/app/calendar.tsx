import { useCallback, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar, type DateData } from "react-native-calendars";
import type { Href } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { supabase } from "@/src/lib/supabase";
import { ensureNotificationPermissions, loadExpoNotificationsModule } from "@/src/utils/notifications";

type ApptRow = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  reminder_minutes_before: number;
  notes: string | null;
};

export default function CalendarScreen() {
  const { theme } = useAppTheme();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const [rows, setRows] = useState<ApptRow[]>([]);
  const [cycles, setCycles] = useState<{ start_date: string; end_date: string | null; protocol_name: string }[]>([]);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState(() => new Date());
  const [reminderMin, setReminderMin] = useState(1440);
  const [notes, setNotes] = useState("");
  const [apptKind, setApptKind] = useState<"consult" | "exam" | "other">("consult");
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    if (!patient) return;
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase
        .from("patient_appointments")
        .select("id, title, kind, starts_at, reminder_minutes_before, notes")
        .eq("patient_id", patient.id)
        .order("starts_at", { ascending: true }),
      supabase.from("treatment_cycles").select("start_date, end_date, protocol_name").eq("patient_id", patient.id),
    ]);
    setRows((a ?? []) as ApptRow[]);
    setCycles((c ?? []) as typeof cycles);
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const marked = useMemo(() => {
    const m: Record<string, { marked?: boolean; dots?: { color: string }[] }> = {};
    for (const r of rows) {
      const day = r.starts_at.slice(0, 10);
      m[day] = { marked: true, dots: [{ color: theme.colors.semantic.treatment }] };
    }
    for (const cy of cycles) {
      const s = new Date(cy.start_date.includes("T") ? cy.start_date : `${cy.start_date}T12:00:00`);
      const e = cy.end_date
        ? new Date(cy.end_date.includes("T") ? cy.end_date : `${cy.end_date}T12:00:00`)
        : new Date(s.getTime() + 21 * 86400000);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        m[key] = { marked: true, dots: [{ color: theme.colors.semantic.vitals }] };
      }
    }
    return m;
  }, [rows, cycles, theme.colors.semantic.treatment, theme.colors.semantic.vitals]);

  async function saveAppt() {
    if (!patient) return;
    const t = title.trim();
    if (!t) {
      Alert.alert("Consulta", "Indique um título.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("patient_appointments")
      .insert({
        patient_id: patient.id,
        title: t,
        kind: apptKind,
        starts_at: starts.toISOString(),
        reminder_minutes_before: reminderMin,
        notes: notes.trim() || null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      Alert.alert("Consulta", error?.message ?? "Erro ao guardar.");
      return;
    }
    const remindAt = new Date(starts.getTime() - reminderMin * 60 * 1000);
    if (remindAt > new Date()) {
      const ok = await ensureNotificationPermissions();
      if (ok) {
        try {
          const Notifications = await loadExpoNotificationsModule();
          if (Notifications) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Lembrete de consulta/exame",
                body: t,
                sound: true,
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: remindAt },
            });
          }
        } catch {
          /* Expo Go / ambiente sem notificações locais */
        }
      }
    }
    setModal(false);
    setTitle("");
    setNotes("");
    setApptKind("consult");
    await load();
  }

  if (!patient) {
    return (
      <ResponsiveScreen>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Complete o cadastro do paciente.</Text>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: theme.spacing.md }}>
        <Pressable onPress={goBack} accessibilityRole="button">
          <FontAwesome name="chevron-left" size={22} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Calendário</Text>
        <Pressable onPress={() => setModal(true)} accessibilityRole="button">
          <FontAwesome name="plus-circle" size={26} color={theme.colors.semantic.treatment} />
        </Pressable>
      </View>

      <Calendar
        markedDates={marked}
        onDayPress={(d: DateData) => {
          /* noop — could filter list */
        }}
        theme={{
          calendarBackground: theme.colors.background.primary,
          dayTextColor: theme.colors.text.primary,
          monthTextColor: theme.colors.text.primary,
          textDisabledColor: theme.colors.text.tertiary,
          arrowColor: theme.colors.semantic.treatment,
          todayTextColor: theme.colors.semantic.treatment,
        }}
      />

      <Text style={[theme.typography.headline, { marginTop: theme.spacing.lg, color: theme.colors.text.primary }]}>
        Próximos eventos
      </Text>
      <ScrollView style={{ marginTop: theme.spacing.sm, maxHeight: 280 }}>
        {rows.length === 0 ? (
          <Text style={{ color: theme.colors.text.secondary }}>Nenhuma consulta ou exame agendado.</Text>
        ) : (
          rows.map((r) => (
            <View
              key={r.id}
              style={{
                padding: theme.spacing.md,
                marginBottom: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.background.secondary,
              }}
            >
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{r.title}</Text>
              <Text style={{ color: theme.colors.text.secondary, marginTop: 4, fontSize: 12, fontWeight: "600" }}>
                {r.kind === "exam"
                  ? "Exame"
                  : r.kind === "consult"
                    ? "Consulta"
                    : r.kind === "infusion"
                      ? "Infusão (agenda hospitalar)"
                      : "Outro"}
              </Text>
              <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>
                {new Date(r.starts_at).toLocaleString()}
              </Text>
              {r.notes ? <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>{r.notes}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            keyboardShouldPersistTaps="handled"
          >
          <View
            style={{
              backgroundColor: theme.colors.background.primary,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
            }}
          >
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Novo lembrete</Text>
            <TextInput
              placeholder="Título (ex.: Oncologia ou RM de estadiamento)"
              placeholderTextColor={theme.colors.text.tertiary}
              value={title}
              onChangeText={setTitle}
              style={{
                marginTop: theme.spacing.md,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
              }}
            />
            <Text style={[theme.typography.body, { marginTop: theme.spacing.md, color: theme.colors.text.secondary }]}>Tipo</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {(
                [
                  { k: "consult" as const, label: "Consulta" },
                  { k: "exam" as const, label: "Exame" },
                  { k: "other" as const, label: "Outro" },
                ] as const
              ).map(({ k, label }) => (
                <Pressable
                  key={k}
                  onPress={() => setApptKind(k)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: theme.radius.md,
                    backgroundColor: apptKind === k ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: apptKind === k ? "700" : "500" }}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                value={starts}
                mode="datetime"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setStarts(d);
                }}
              />
            ) : showPicker ? (
              <DateTimePicker
                value={starts}
                mode="datetime"
                display="default"
                onChange={(_, d) => {
                  setShowPicker(false);
                  if (d) setStarts(d);
                }}
              />
            ) : (
              <Pressable onPress={() => setShowPicker(true)} style={{ marginTop: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.semantic.treatment }}>
                  {starts.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </Text>
              </Pressable>
            )}
            <Text style={[theme.typography.body, { marginTop: theme.spacing.md, color: theme.colors.text.secondary }]}>
              Lembrar (minutos antes): {reminderMin >= 1440 ? `${reminderMin / 1440} dia(s)` : `${reminderMin} min`}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {[60, 360, 1440, 2880].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setReminderMin(m)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: reminderMin === m ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary, fontSize: 13 }}>{m === 1440 ? "24h" : m === 2880 ? "48h" : `${m}m`}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Notas (opcional)"
              placeholderTextColor={theme.colors.text.tertiary}
              value={notes}
              onChangeText={setNotes}
              style={{
                marginTop: theme.spacing.md,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.secondary,
                color: theme.colors.text.primary,
              }}
            />
            <Pressable
              onPress={saveAppt}
              disabled={busy}
              style={{
                marginTop: theme.spacing.lg,
                backgroundColor: theme.colors.semantic.treatment,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                alignItems: "center",
              }}
            >
              <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Guardar</Text>
            </Pressable>
            <Pressable onPress={() => setModal(false)} style={{ marginTop: theme.spacing.md, alignItems: "center" }}>
              <Text style={{ color: theme.colors.text.secondary }}>Cancelar</Text>
            </Pressable>
          </View>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </ResponsiveScreen>
  );
}
