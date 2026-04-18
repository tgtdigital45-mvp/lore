import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { Calendar, type DateData } from "react-native-calendars";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CategoryMoreSection } from "@/src/health/components/CategoryMoreSection";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { usePinnedCategoryShortcut } from "@/src/hooks/usePinnedCategoryShortcut";
import { useStackBack } from "@/src/hooks/useStackBack";
import { homeSummaryQueryKey } from "@/src/home/useHomeSummary";
import { supabase } from "@/src/lib/supabase";
import { ensureNotificationPermissions, loadExpoNotificationsModule } from "@/src/utils/notifications";

type ApptRow = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  reminder_minutes_before: number;
  notes: string | null;
  pinned: boolean;
};

function localYmd(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD no fuso local (evita desvio ao usar toISOString no dia selecionado). */
function dateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatSelectedDayLabel(day: Date, today: Date): string {
  const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  if (strip(day) === strip(today)) {
    return `Hoje, ${day.getDate()} de ${day.toLocaleDateString("pt-BR", { month: "long" })}`;
  }
  return day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function kindLabel(kind: string): string {
  if (kind === "exam") return "Exame";
  if (kind === "consult") return "Consulta";
  if (kind === "infusion") return "Infusão (agenda hospitalar)";
  return "Outro";
}

export default function CalendarScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { pinned, toggle, ready: pinReady } = usePinnedCategoryShortcut("calendar");

  const [rows, setRows] = useState<ApptRow[]>([]);
  const [cycles, setCycles] = useState<{ start_date: string; end_date: string | null; protocol_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date(today));

  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState(() => new Date());
  const [reminderMin, setReminderMin] = useState(1440);
  const [notes, setNotes] = useState("");
  const [apptKind, setApptKind] = useState<"consult" | "exam" | "other">("consult");
  const [busy, setBusy] = useState(false);
  /** Android: nunca montar DateTimePicker datetime inline no modal — evita crash ao dismiss nativo. */
  const [androidPicker, setAndroidPicker] = useState<null | "date" | "time">(null);

  const load = useCallback(async () => {
    if (!patient) {
      setRows([]);
      setCycles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase
        .from("patient_appointments")
        .select("id, title, kind, starts_at, reminder_minutes_before, notes, pinned")
        .eq("patient_id", patient.id)
        .order("starts_at", { ascending: true }),
      supabase.from("treatment_cycles").select("start_date, end_date, protocol_name").eq("patient_id", patient.id),
    ]);
    const normalized = ((a ?? []) as ApptRow[]).map((r) => ({ ...r, pinned: Boolean(r.pinned) }));
    setRows(normalized);
    setCycles((c ?? []) as typeof cycles);
    setLoading(false);
  }, [patient]);

  const toggleApptPinned = useCallback(
    async (id: string, value: boolean) => {
      if (!patient) return;
      const { error } = await supabase.from("patient_appointments").update({ pinned: value }).eq("id", id);
      if (error) {
        Alert.alert("Agenda", error.message);
        return;
      }
      await load();
      void queryClient.invalidateQueries({ queryKey: homeSummaryQueryKey(patient.id) });
    },
    [patient, load, queryClient]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const selectedYmd = useMemo(() => dateToYmd(selectedDate), [selectedDate]);

  const marked = useMemo(() => {
    const m: Record<string, { marked?: boolean; dots?: { color: string }[]; selected?: boolean; selectedColor?: string }> =
      {};

    const pushDot = (key: string, color: string) => {
      const prev = m[key];
      const dots = prev?.dots ? [...prev.dots] : [];
      if (!dots.some((x) => x.color === color)) dots.push({ color });
      m[key] = { marked: true, dots };
    };

    for (const r of rows) {
      pushDot(localYmd(r.starts_at), theme.colors.semantic.treatment);
    }
    for (const cy of cycles) {
      const s = new Date(cy.start_date.includes("T") ? cy.start_date : `${cy.start_date}T12:00:00`);
      const e = cy.end_date
        ? new Date(cy.end_date.includes("T") ? cy.end_date : `${cy.end_date}T12:00:00`)
        : new Date(s.getTime() + 21 * 86400000);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        pushDot(dateToYmd(d), theme.colors.semantic.vitals);
      }
    }

    m[selectedYmd] = {
      ...(m[selectedYmd] ?? {}),
      selected: true,
      selectedColor: theme.colors.semantic.treatment,
    };
    return m;
  }, [rows, cycles, selectedYmd, theme.colors.semantic.treatment, theme.colors.semantic.vitals]);

  const dayRows = useMemo(() => {
    return rows.filter((r) => localYmd(r.starts_at) === selectedYmd);
  }, [rows, selectedYmd]);

  const nextFuture = useMemo(() => {
    const now = Date.now();
    const upcoming = rows.filter((r) => new Date(r.starts_at).getTime() >= now);
    upcoming.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    return upcoming[0] ?? null;
  }, [rows]);

  /** Dia selecionado sem nada na lista, mas existe um compromisso futuro noutro dia — mostrar atalho. */
  const showNextOnOtherDay =
    dayRows.length === 0 &&
    nextFuture != null &&
    localYmd(nextFuture.starts_at) !== selectedYmd;

  const closeModal = () => {
    setAndroidPicker(null);
    setModal(false);
  };

  const openModal = () => {
    setStarts(new Date());
    setAndroidPicker(null);
    setModal(true);
  };

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
    closeModal();
    setTitle("");
    setNotes("");
    setApptKind("consult");
    await load();
  }

  const onDayPress = (d: DateData) => {
    const [y, mo, day] = d.dateString.split("-").map(Number);
    setSelectedDate(new Date(y, mo - 1, day));
  };

  if (!patient) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
          }}
        >
          <CircleChromeButton accessibilityLabel="Voltar" onPress={goBack}>
            <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
          </CircleChromeButton>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontWeight: "600",
              color: theme.colors.text.primary,
              letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
            }}
          >
            Agendamentos
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
            Complete o cadastro do paciente para gerir a agenda.
          </Text>
        </View>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <CircleChromeButton accessibilityLabel="Voltar" onPress={goBack}>
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </CircleChromeButton>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "600",
            color: theme.colors.text.primary,
            letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
          }}
        >
          Agendamentos
        </Text>
        <CircleChromeButton accessibilityLabel="Novo compromisso" onPress={openModal}>
          <FontAwesome name="plus" size={16} color={theme.colors.semantic.treatment} />
        </CircleChromeButton>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.lg }]}>
            A carregar…
          </Text>
        ) : (
          <>
            {/* Resumo — próximo compromisso */}
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
                Próximo compromisso
              </Text>
              {nextFuture ? (
                <Pressable
                  onPress={() => {
                    const d = new Date(nextFuture.starts_at);
                    setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                >
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{nextFuture.title}</Text>
                  <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4, fontWeight: "600" }}>
                    {kindLabel(nextFuture.kind)}
                  </Text>
                  <Text style={{ fontSize: 15, color: theme.colors.text.secondary, marginTop: 6 }}>
                    {new Date(nextFuture.starts_at).toLocaleString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {nextFuture.notes ? (
                    <Text style={{ fontSize: 14, color: theme.colors.text.tertiary, marginTop: 8 }} numberOfLines={2}>
                      {nextFuture.notes}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 13, color: IOS_HEALTH.blue, marginTop: 10, fontWeight: "600" }}>
                    Ver no calendário
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                    Nenhum compromisso futuro registado. Toque em + para adicionar consultas, exames ou lembretes.
                  </Text>
                  <Pressable
                    onPress={openModal}
                    style={({ pressed }) => ({
                      marginTop: theme.spacing.md,
                      backgroundColor: theme.colors.semantic.treatment,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.radius.md,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Adicionar compromisso</Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Legenda */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginBottom: theme.spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.semantic.treatment }} />
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>Consulta / exame</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.semantic.vitals }} />
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>Dias de tratamento</Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.sm,
                marginBottom: theme.spacing.md,
                overflow: "hidden",
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <Calendar
                markedDates={marked}
                onDayPress={onDayPress}
                theme={{
                  calendarBackground: theme.colors.background.primary,
                  dayTextColor: theme.colors.text.primary,
                  monthTextColor: theme.colors.text.primary,
                  textDisabledColor: theme.colors.text.tertiary,
                  arrowColor: theme.colors.semantic.treatment,
                  todayTextColor: theme.colors.semantic.treatment,
                  selectedDayBackgroundColor: theme.colors.semantic.treatment,
                  selectedDayTextColor: "#FFFFFF",
                }}
              />
            </View>

            <Pressable onPress={() => setSelectedDate(new Date(today))} style={{ alignItems: "center", marginBottom: theme.spacing.md }}>
              <Text
                style={[theme.typography.title2, { color: theme.colors.text.primary, textTransform: "capitalize" }]}
              >
                {formatSelectedDayLabel(selectedDate, today)}
              </Text>
              <FontAwesome name="caret-down" size={16} color={theme.colors.text.secondary} style={{ marginTop: 4 }} />
            </Pressable>

            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
              Este dia
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.md, fontSize: 13 }]}>
              Toque num dia no calendário para ver o que está planeado. Os lembretes locais dependem da permissão de notificações.
            </Text>

            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                overflow: "hidden",
                marginBottom: theme.spacing.lg,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              {dayRows.length === 0 && showNextOnOtherDay ? (
                <View style={{ padding: theme.spacing.md }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.md }]}>
                    Sem compromissos neste dia.
                  </Text>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
                    Próximo agendamento
                  </Text>
                  <Pressable
                    onPress={() => {
                      const d = new Date(nextFuture.starts_at);
                      setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                  >
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{nextFuture.title}</Text>
                    <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4, fontWeight: "600" }}>
                      {kindLabel(nextFuture.kind)}
                    </Text>
                    <Text style={{ fontSize: 15, color: theme.colors.text.secondary, marginTop: 6 }}>
                      {new Date(nextFuture.starts_at).toLocaleString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {nextFuture.notes ? (
                      <Text style={{ fontSize: 14, color: theme.colors.text.tertiary, marginTop: 8 }} numberOfLines={2}>
                        {nextFuture.notes}
                      </Text>
                    ) : null}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: theme.spacing.md,
                        paddingTop: theme.spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: IOS_HEALTH.separator,
                      }}
                    >
                      <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1, paddingRight: theme.spacing.sm }]}>
                        Fixar no resumo
                      </Text>
                      <Switch
                        value={Boolean(nextFuture.pinned)}
                        onValueChange={(v) => {
                          void toggleApptPinned(nextFuture.id, v);
                        }}
                        trackColor={{ false: theme.colors.background.tertiary, true: theme.colors.semantic.treatment }}
                        thumbColor={Platform.OS === "android" ? (nextFuture.pinned ? "#fff" : "#f4f3f4") : undefined}
                      />
                    </View>
                    <Text style={{ fontSize: 13, color: IOS_HEALTH.blue, marginTop: 10, fontWeight: "600" }}>
                      Ver este dia no calendário
                    </Text>
                  </Pressable>
                </View>
              ) : dayRows.length === 0 ? (
                <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
                  <FontAwesome name="calendar-o" size={28} color={theme.colors.text.tertiary} />
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: "center" }]}>
                    Nada agendado neste dia.
                  </Text>
                </View>
              ) : (
                dayRows.map((r, idx) => (
                  <View
                    key={r.id}
                    style={{
                      padding: theme.spacing.md,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: IOS_HEALTH.separator,
                    }}
                  >
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{r.title}</Text>
                    <Text style={{ color: theme.colors.text.secondary, marginTop: 4, fontSize: 12, fontWeight: "600" }}>
                      {kindLabel(r.kind)}
                    </Text>
                    <Text style={{ color: theme.colors.text.secondary, marginTop: 4 }}>
                      {new Date(r.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </Text>
                    {r.notes ? (
                      <Text style={{ color: theme.colors.text.tertiary, marginTop: 6, fontSize: 14 }}>{r.notes}</Text>
                    ) : null}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: theme.spacing.md,
                        paddingTop: theme.spacing.md,
                        borderTopWidth: 1,
                        borderTopColor: IOS_HEALTH.separator,
                      }}
                    >
                      <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1, paddingRight: theme.spacing.sm }]}>
                        Fixar no resumo
                      </Text>
                      <Switch
                        value={Boolean(r.pinned)}
                        onValueChange={(v) => {
                          void toggleApptPinned(r.id, v);
                        }}
                        trackColor={{ false: theme.colors.background.tertiary, true: theme.colors.semantic.treatment }}
                        thumbColor={Platform.OS === "android" ? (r.pinned ? "#fff" : "#f4f3f4") : undefined}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Sobre */}
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.lg,
                ...IOS_HEALTH.shadow.card,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 96,
                  borderRadius: theme.radius.md,
                  backgroundColor: "#0a1628",
                  marginBottom: theme.spacing.md,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="calendar" size={36} color={IOS_HEALTH.blue} />
              </View>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sobre a agenda</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Os compromissos ficam na sua conta (RLS). Os dias marcados a verde-claro indicam períodos de ciclo de tratamento; os seus
                eventos aparecem como bolinhas cor de destaque. Lembretes no telemóvel são opcionais e pedem permissão.
              </Text>
            </View>

            {patient && pinReady ? (
              <CategoryMoreSection
                theme={theme}
                pinned={pinned}
                onTogglePin={() => void toggle()}
                onExportPdf={() => router.push("/reports" as Href)}
                onOptionsPress={() => Alert.alert("Opções", "Preferências de agenda em breve.")}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={closeModal}>
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
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Novo compromisso</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginTop: 6, fontSize: 13 }]}>
                  Consulta, exame ou outro evento — pode definir lembrete local.
                </Text>
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
                      <Text style={{ color: theme.colors.text.primary, fontSize: 14, fontWeight: apptKind === k ? "700" : "500" }}>
                        {label}
                      </Text>
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
                ) : (
                  <>
                    <Text style={[theme.typography.body, { marginTop: theme.spacing.md, color: theme.colors.text.secondary }]}>
                      Data e hora
                    </Text>
                    <Pressable
                      onPress={() => setAndroidPicker("date")}
                      style={{
                        marginTop: theme.spacing.sm,
                        paddingVertical: 14,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.background.secondary,
                      }}
                    >
                      <Text style={{ color: theme.colors.text.primary, fontWeight: "600", textAlign: "center" }}>
                        {starts.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, textAlign: "center", marginTop: 4 }}>
                        Toque para alterar a data
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAndroidPicker("time")}
                      style={{
                        marginTop: theme.spacing.sm,
                        paddingVertical: 14,
                        paddingHorizontal: theme.spacing.md,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.background.secondary,
                      }}
                    >
                      <Text style={{ color: theme.colors.text.primary, fontWeight: "600", textAlign: "center" }}>
                        {starts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, textAlign: "center", marginTop: 4 }}>
                        Toque para alterar a hora
                      </Text>
                    </Pressable>
                    {androidPicker === "date" ? (
                      <DateTimePicker
                        value={starts}
                        mode="date"
                        display="default"
                        onChange={(event: DateTimePickerEvent, d) => {
                          setAndroidPicker(null);
                          if (event.type === "dismissed") return;
                          if (d) {
                            const next = new Date(starts);
                            next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                            setStarts(next);
                          }
                        }}
                      />
                    ) : null}
                    {androidPicker === "time" ? (
                      <DateTimePicker
                        value={starts}
                        mode="time"
                        display="default"
                        onChange={(event: DateTimePickerEvent, t) => {
                          setAndroidPicker(null);
                          if (event.type === "dismissed") return;
                          if (t) {
                            const next = new Date(starts);
                            next.setHours(t.getHours(), t.getMinutes(), 0, 0);
                            setStarts(next);
                          }
                        }}
                      />
                    ) : null}
                  </>
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
                      <Text style={{ color: theme.colors.text.primary, fontSize: 13 }}>
                        {m === 1440 ? "24h" : m === 2880 ? "48h" : `${m}m`}
                      </Text>
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
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Guardar</Text>
                </Pressable>
                <Pressable onPress={closeModal} style={{ marginTop: theme.spacing.md, alignItems: "center" }}>
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
