import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CategoryMoreSection } from "@/src/health/components/CategoryMoreSection";
import {
  MedicationCalendarStrip,
  type MedicationCalendarStripHandle,
} from "@/src/health/components/MedicationCalendarStrip";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useFocusEffect } from "@react-navigation/native";
import { useMedications, type MedicationRow } from "@/src/hooks/useMedications";
import { usePatient } from "@/src/hooks/usePatient";
import { usePinnedCategoryShortcut } from "@/src/hooks/usePinnedCategoryShortcut";
import { useMedicationWizard } from "@/src/medications/MedicationWizardContext";
import { MedicationWizardHero } from "@/src/medications/components/MedicationWizardHero";
import { PillPreview } from "@/src/medications/components/PillPreview";
import { supabase } from "@/src/lib/supabase";

type MedicationLogItem = {
  id: string;
  medication_id: string;
  status: string | null;
  taken_time: string | null;
  scheduled_time: string | null;
  quantity: number | null;
  notes: string | null;
};

function generateCalendarDays(centerDate: Date, range: number = 14): Date[] {
  const arr: Date[] = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    arr.push(d);
  }
  return arr;
}

function sameCalendarDay(day: Date, iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

function formatSelectedDayLabel(day: Date, today: Date): string {
  const isToday = day.toDateString() === today.toDateString();
  if (isToday) {
    return `Hoje, ${day.getDate()} de ${day.toLocaleDateString("pt-BR", { month: "long" })}`;
  }
  return day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export default function MedicationsLandingScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { medications, loading: medsLoading, refresh } = useMedications();
  const { patient } = usePatient();
  const { resetDraft } = useMedicationWizard();
  const calendarRef = useRef<MedicationCalendarStripHandle>(null);
  const { pinned, toggle, ready: pinReady } = usePinnedCategoryShortcut("medications");

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editMode, setEditMode] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logRows, setLogRows] = useState<MedicationLogItem[]>([]);
  const [reordering, setReordering] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      if (!patient) return;
      void (async () => {
        setLogsLoading(true);
        try {
          const { data, error } = await supabase
            .from("medication_logs")
            .select("id, medication_id, status, taken_time, scheduled_time, quantity, notes")
            .eq("patient_id", patient.id)
            .order("scheduled_time", { ascending: false })
            .limit(400);
          if (error) throw error;
          setLogRows((data ?? []) as MedicationLogItem[]);
        } catch (err) {
          console.warn("[medication_logs]", err);
        } finally {
          setLogsLoading(false);
        }
      })();
    }, [patient, refresh])
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calendarDays = useMemo(() => generateCalendarDays(today, 21), [today]);

  const hasMedications = medications.length > 0;

  const dayLogs = useMemo(() => {
    return logRows.filter((row) => {
      const iso = row.taken_time ?? row.scheduled_time;
      return sameCalendarDay(selectedDate, iso);
    });
  }, [logRows, selectedDate]);

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
  };

  const scrollToToday = () => {
    calendarRef.current?.scrollTodayToCenter();
    setSelectedDate(today);
  };

  const startNewMedWizard = () => {
    resetDraft();
    router.push("/(tabs)/health/medications/name" as Href);
  };

  const swapSort = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= medications.length) return;
    const a = medications[index];
    const b = medications[j];
    const soA = a.sort_order ?? index;
    const soB = b.sort_order ?? j;
    setReordering(true);
    try {
      const { error: e1 } = await supabase.from("medications").update({ sort_order: soB }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("medications").update({ sort_order: soA }).eq("id", b.id);
      if (e2) throw e2;
      await refresh();
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível reordenar.");
    } finally {
      setReordering(false);
    }
  };

  const archiveMedication = (m: MedicationRow) => {
    Alert.alert(
      "Arquivar medicamento?",
      `${m.display_name?.trim() || m.name} deixa de aparecer nesta aba. Os registos já guardados permanecem associados ao seu histórico.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Arquivar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("medications").update({ archived: true }).eq("id", m.id);
              if (error) throw error;
              await refresh();
            } catch (e: unknown) {
              Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível arquivar.");
            }
          },
        },
      ]
    );
  };

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
          Medicamentos
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {!patient ? (
          <View style={{ paddingHorizontal: theme.spacing.md }}>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              Complete o cadastro do paciente para gerir medicamentos.
            </Text>
          </View>
        ) : medsLoading ? (
          <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: theme.spacing.xl }} />
        ) : !hasMedications ? (
          <View style={{ paddingHorizontal: theme.spacing.md }}>
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: 32,
                paddingBottom: theme.spacing.lg,
                overflow: "hidden",
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md }}>
                <MedicationWizardHero variant="landing" theme={theme} />
              </View>

              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  textAlign: "center",
                  color: theme.colors.text.primary,
                  paddingHorizontal: theme.spacing.lg,
                  marginTop: theme.spacing.sm,
                }}
              >
                Configure seus medicamentos
              </Text>

              <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing.md }}>
                  <FontAwesome name="medkit" size={22} color={IOS_HEALTH.blue} style={{ marginTop: 2, marginRight: theme.spacing.md }} />
                  <Text style={[theme.typography.body, { flex: 1, color: theme.colors.text.primary }]}>
                    Controle todos os seus medicamentos em apenas um lugar.
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing.md }}>
                  <FontAwesome name="calendar" size={22} color={IOS_HEALTH.blue} style={{ marginTop: 2, marginRight: theme.spacing.md }} />
                  <Text style={[theme.typography.body, { flex: 1, color: theme.colors.text.primary }]}>
                    Defina horários e receba lembretes. Marque SOS no assistente se for só quando precisar.
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: IOS_HEALTH.destructive,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                      marginRight: theme.spacing.md,
                    }}
                  >
                    <FontAwesome name="lock" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={[theme.typography.body, { flex: 1, color: theme.colors.text.primary }]}>
                    As informações sobre os seus medicamentos são criptografadas e não podem ser lidas por ninguém sem a sua permissão.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={startNewMedWizard}
                style={({ pressed }) => ({
                  marginHorizontal: theme.spacing.lg,
                  marginTop: theme.spacing.lg,
                  backgroundColor: IOS_HEALTH.blue,
                  paddingVertical: 14,
                  borderRadius: IOS_HEALTH.pillButtonRadius,
                  alignItems: "center",
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Adicionar um medicamento</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Pressable
              onPress={scrollToToday}
              style={{ alignItems: "center", marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.md }}
            >
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary, textTransform: "capitalize" }]}>
                {formatSelectedDayLabel(selectedDate, today)}
              </Text>
              <FontAwesome name="caret-down" size={16} color={theme.colors.text.secondary} style={{ marginTop: 4 }} />
            </Pressable>

            <MedicationCalendarStrip
              ref={calendarRef}
              theme={theme}
              days={calendarDays}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />

            <View style={{ paddingHorizontal: theme.spacing.md }}>
              {/* Registrar */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: theme.spacing.md,
                  marginTop: theme.spacing.sm,
                  gap: theme.spacing.sm,
                }}
              >
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>
                  Registrar
                </Text>
                <Pressable
                  onPress={startNewMedWizard}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "#34C759",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome name="plus" size={14} color="#FFF" />
                  </View>
                  <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Novo</Text>
                </Pressable>
              </View>

              <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.sm, fontSize: 13 }]}>
                Registos de tomas neste dia. Para marcar SOS ou horários fixos, use o assistente ao adicionar medicamento.
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
                {logsLoading ? (
                  <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
                    <ActivityIndicator color={IOS_HEALTH.blue} />
                  </View>
                ) : dayLogs.length === 0 ? (
                  <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
                    <FontAwesome name="history" size={28} color={theme.colors.text.tertiary} />
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: "center" }]}>
                      Nenhum registo neste dia.
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.colors.text.tertiary, marginTop: 6, textAlign: "center" }}>
                      Toque em «Novo» para cadastrar ou abra um medicamento em «Seus medicamentos» para registar uma dose.
                    </Text>
                  </View>
                ) : (
                  dayLogs.map((row, idx) => {
                    const med = medications.find((m) => m.id === row.medication_id);
                    const label = med?.display_name?.trim() || med?.name || "Medicamento";
                    const when = row.taken_time ?? row.scheduled_time;
                    const left = med?.color_left ?? "#FF3B30";
                    const right = med?.color_right ?? "#FFADB0";
                    const bg = med?.color_bg ?? "#007AFF";
                    return (
                      <Pressable
                        key={row.id}
                        onPress={() => med && router.push(`/(tabs)/health/medications/detail?id=${med.id}` as Href)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: theme.spacing.md,
                          gap: theme.spacing.md,
                          borderBottomWidth: idx < dayLogs.length - 1 ? 1 : 0,
                          borderBottomColor: IOS_HEALTH.separator,
                        }}
                      >
                        <PillPreview colorLeft={left} colorRight={right} colorBg={bg} size={40} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                            {label}
                          </Text>
                          <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 }}>
                            {when ? new Date(when).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                            {" · "}
                            {row.status === "taken" ? "Tomado" : row.status === "skipped" ? "Não tomado" : row.status ?? "—"}
                            {row.quantity != null && row.quantity > 1 ? ` · Qtd ${row.quantity}` : ""}
                          </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                      </Pressable>
                    );
                  })
                )}
              </View>

              {/* Seus medicamentos */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: theme.spacing.sm,
                  gap: theme.spacing.sm,
                }}
              >
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary, flex: 1 }]} numberOfLines={1}>
                  Seus medicamentos
                </Text>
                <Pressable onPress={() => setEditMode((e) => !e)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>{editMode ? "Concluir" : "Editar"}</Text>
                </Pressable>
              </View>

              <View
                style={{
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: IOS_HEALTH.groupedListRadius,
                  overflow: "hidden",
                  marginBottom: theme.spacing.lg,
                  ...IOS_HEALTH.shadow.card,
                }}
              >
                {medications.map((m, idx) => {
                  const left = m.color_left ?? "#FF3B30";
                  const right = m.color_right ?? "#FFADB0";
                  const bg = m.color_bg ?? "#007AFF";
                  const scheduleText =
                    m.repeat_mode === "as_needed"
                      ? "SOS — quando precisar"
                      : m.repeat_mode === "interval_hours"
                        ? `A cada ${m.frequency_hours} h`
                        : m.medication_schedules?.length
                          ? `${m.medication_schedules.length} horário(s)`
                          : "Agendado";
                  return (
                    <View
                      key={m.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        borderBottomWidth: idx < medications.length - 1 ? 1 : 0,
                        borderBottomColor: IOS_HEALTH.separator,
                      }}
                    >
                      {editMode ? (
                        <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: theme.spacing.xs }}>
                          <Pressable
                            onPress={() => void swapSort(idx, -1)}
                            disabled={idx === 0 || reordering}
                            style={{ padding: theme.spacing.sm, opacity: idx === 0 ? 0.35 : 1 }}
                          >
                            <FontAwesome name="chevron-up" size={16} color={IOS_HEALTH.blue} />
                          </Pressable>
                          <Pressable
                            onPress={() => void swapSort(idx, 1)}
                            disabled={idx === medications.length - 1 || reordering}
                            style={{ padding: theme.spacing.sm, opacity: idx === medications.length - 1 ? 0.35 : 1 }}
                          >
                            <FontAwesome name="chevron-down" size={16} color={IOS_HEALTH.blue} />
                          </Pressable>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={() => !editMode && router.push(`/(tabs)/health/medications/detail?id=${m.id}` as Href)}
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", padding: theme.spacing.md, gap: theme.spacing.md }}
                      >
                        <PillPreview colorLeft={left} colorRight={right} colorBg={bg} size={52} />
                        <View style={{ flex: 1, minWidth: 0, paddingRight: theme.spacing.xs }}>
                          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                            {m.display_name?.trim() || m.name}
                          </Text>
                          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2 }]} numberOfLines={1}>
                            {m.form ?? "—"} · {m.dosage ?? "—"}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                            <FontAwesome name="clock-o" size={12} color={theme.colors.text.tertiary} />
                            <Text style={{ fontSize: 13, color: theme.colors.text.tertiary, flex: 1 }} numberOfLines={2}>
                              {scheduleText}
                            </Text>
                          </View>
                        </View>
                        {!editMode ? <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} /> : null}
                      </Pressable>
                      {editMode ? (
                        <Pressable
                          onPress={() => archiveMedication(m)}
                          style={{ padding: theme.spacing.md }}
                          accessibilityLabel="Arquivar medicamento"
                        >
                          <FontAwesome name="archive" size={18} color={theme.colors.text.tertiary} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {/* Sobre medicamentos */}
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
                    height: 112,
                    borderRadius: theme.radius.md,
                    backgroundColor: "#0f1a14",
                    marginBottom: theme.spacing.md,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome name="medkit" size={40} color={theme.colors.semantic.treatment} />
                </View>
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sobre medicamentos</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                  Os lembretes ajudam a manter a rotina; o registo de tomas cria um histórico útil nas consultas. O app não substitui
                  indicação médica — em dúvida, fale com a sua equipa de saúde.
                </Text>
              </View>

              {patient && pinReady ? (
                <CategoryMoreSection
                  theme={theme}
                  pinned={pinned}
                  onTogglePin={() => void toggle()}
                  onExportPdf={() => router.push("/reports" as Href)}
                  onOptionsPress={() => Alert.alert("Opções", "Preferências de medicamentos em breve.")}
                />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </ResponsiveScreen>
  );
}
