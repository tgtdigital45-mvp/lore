import { Alert, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useFocusEffect } from "@react-navigation/native";
import { useMedications, type MedicationRow } from "@/src/hooks/useMedications";
import { usePatient } from "@/src/hooks/usePatient";
import { useMedicationWizard } from "@/src/medications/MedicationWizardContext";
import { MedicationWizardHero } from "@/src/medications/components/MedicationWizardHero";
import { PillPreview } from "@/src/medications/components/PillPreview";
import { supabase } from "@/src/lib/supabase";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function generateCalendarDays(centerDate: Date, range: number = 14): Date[] {
  const arr: Date[] = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    arr.push(d);
  }
  return arr;
}

function groupSchedulesByTime(medications: MedicationRow[]): Map<string, { med: MedicationRow; slot: { time_of_day: string; quantity: number } }[]> {
  const map = new Map<string, { med: MedicationRow; slot: { time_of_day: string; quantity: number } }[]>();
  
  for (const med of medications) {
    if (!med.active) continue;
    if (med.repeat_mode === "as_needed") continue;
    
    const schedules = med.medication_schedules ?? [];
    for (const slot of schedules) {
      const key = slot.time_of_day.slice(0, 5);
      const arr = map.get(key) ?? [];
      arr.push({ med, slot });
      map.set(key, arr);
    }
    
    if (schedules.length === 0 && med.anchor_at) {
      const anchor = new Date(med.anchor_at);
      const hh = anchor.getHours().toString().padStart(2, "0");
      const mm = anchor.getMinutes().toString().padStart(2, "0");
      const key = `${hh}:${mm}`;
      const arr = map.get(key) ?? [];
      arr.push({ med, slot: { time_of_day: `${key}:00`, quantity: 1 } });
      map.set(key, arr);
    }
  }
  
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export default function MedicationsLandingScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { medications, refresh } = useMedications();
  const { patient } = usePatient();
  const { resetDraft, setDraft } = useMedicationWizard();
  const calendarScrollRef = useRef<ScrollView>(null);
  
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editMode, setEditMode] = useState(false);
  const [logModalMed, setLogModalMed] = useState<MedicationRow | null>(null);
  const [logDate, setLogDate] = useState(() => new Date());
  const [logTime, setLogTime] = useState(() => new Date());
  const [logOutcome, setLogOutcome] = useState<"taken" | "skipped" | null>(null);
  const [loggingDose, setLoggingDose] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const calendarDays = useMemo(() => generateCalendarDays(today, 21), [today]);

  const scheduledMeds = useMemo(
    () => medications.filter((m) => m.active && m.repeat_mode !== "as_needed"),
    [medications]
  );
  const asNeededMeds = useMemo(
    () => medications.filter((m) => m.active && m.repeat_mode === "as_needed"),
    [medications]
  );
  const scheduleGroups = useMemo(() => groupSchedulesByTime(scheduledMeds), [scheduledMeds]);

  const hasMedications = medications.length > 0;

  const handleSelectDate = (d: Date) => {
    setSelectedDate(d);
  };

  const scrollToToday = () => {
    const idx = calendarDays.findIndex((d) => d.toDateString() === today.toDateString());
    if (idx >= 0 && calendarScrollRef.current) {
      calendarScrollRef.current.scrollTo({ x: idx * 48 - 120, animated: true });
    }
    setSelectedDate(today);
  };

  const openLogModal = (med: MedicationRow) => {
    setLogModalMed(med);
    setLogDate(new Date());
    setLogTime(new Date());
    setLogOutcome(null);
  };

  const saveMedicationLog = async () => {
    if (!logModalMed || !patient || !logOutcome) return;
    setLoggingDose(true);
    try {
      const at = new Date(logDate);
      at.setHours(logTime.getHours(), logTime.getMinutes(), 0, 0);
      const iso = at.toISOString();

      const base = {
        patient_id: patient.id,
        medication_id: logModalMed.id,
        scheduled_time: iso,
        quantity: 1,
      };

      const { error } =
        logOutcome === "taken"
          ? await supabase.from("medication_logs").insert({
              ...base,
              taken_time: iso,
              status: "taken",
            })
          : await supabase.from("medication_logs").insert({
              ...base,
              taken_time: null,
              status: "skipped",
            });

      if (error) throw error;
      const label = logModalMed.display_name?.trim() || logModalMed.name;
      Alert.alert(
        "Registado",
        logOutcome === "taken" ? `Toma de ${label} guardada.` : `Registámos que não tomou ${label}.`
      );
      setLogModalMed(null);
      setLogOutcome(null);
      await refresh();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível guardar o registro.");
    } finally {
      setLoggingDose(false);
    }
  };

  const startNewMedWizard = (asNeeded: boolean = false) => {
    resetDraft();
    if (asNeeded) {
      setDraft({ frequency: "as_needed" });
    }
    router.push("/(tabs)/health/medications/name" as Href);
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
        {!hasMedications ? (
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
                    Defina horários e receba lembretes.
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
                    As informações sobre os seus medicamentos são criptografadas e não podem ser lidas por ninguém sem a sua
                    permissão.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => startNewMedWizard(false)}
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
            {/* Date header */}
            <Pressable
              onPress={scrollToToday}
              style={{ alignItems: "center", marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md }}
            >
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>
                Hoje, {today.getDate()} de {today.toLocaleDateString("pt-BR", { month: "long" })}
              </Text>
              <FontAwesome name="caret-down" size={16} color={theme.colors.text.secondary} style={{ marginTop: 4 }} />
            </Pressable>

            {/* Horizontal scrollable calendar */}
            <ScrollView
              ref={calendarScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                alignItems: "center",
              }}
              style={{ marginBottom: theme.spacing.lg }}
              onLayout={() => {
                const idx = calendarDays.findIndex((d) => d.toDateString() === today.toDateString());
                if (idx >= 0) {
                  setTimeout(() => {
                    calendarScrollRef.current?.scrollTo({ x: idx * 48 - 120, animated: false });
                  }, 100);
                }
              }}
            >
              {calendarDays.map((d, i) => {
                const isToday = d.toDateString() === today.toDateString();
                const isSelected = d.toDateString() === selectedDate.toDateString();
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleSelectDate(d)}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 48,
                      minHeight: 64,
                      paddingVertical: theme.spacing.sm,
                      marginRight: 6,
                      borderRadius: 22,
                      backgroundColor: isSelected ? theme.colors.text.primary : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        color: isSelected ? "#FFFFFF" : theme.colors.text.tertiary,
                      }}
                    >
                      {WEEKDAYS[d.getDay()]}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: isToday ? "700" : "500",
                        color: isSelected ? "#FFFFFF" : theme.colors.text.primary,
                        marginTop: 4,
                      }}
                    >
                      {d.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: theme.spacing.md }}>
              {/* Registrar section - para cadastrar novos medicamentos */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: theme.spacing.md,
                  gap: theme.spacing.sm,
                }}
              >
                <Text
                  style={[theme.typography.title2, { color: theme.colors.text.primary, flex: 1, flexShrink: 1 }]}
                  numberOfLines={1}
                >
                  Registrar
                </Text>
                <Pressable
                  onPress={() => startNewMedWizard(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
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

              {scheduleGroups.size > 0 ? (
                <View
                  style={{
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: IOS_HEALTH.groupedListRadius,
                    overflow: "hidden",
                    marginBottom: theme.spacing.lg,
                    ...IOS_HEALTH.shadow.card,
                  }}
                >
                  {[...scheduleGroups.entries()].map(([time, items], groupIdx) => (
                    <View key={time}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: theme.spacing.md,
                          paddingTop: theme.spacing.md,
                          paddingBottom: theme.spacing.sm,
                        }}
                      >
                        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{time}</Text>
                        <Pressable
                          onPress={() => startNewMedWizard(false)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
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
                        </Pressable>
                      </View>
                      {items.map(({ med }, idx) => {
                        const left = med.color_left ?? "#FF3B30";
                        const right = med.color_right ?? "#FFADB0";
                        const bg = med.color_bg ?? "#007AFF";
                        return (
                          <Pressable
                            key={`${med.id}-${idx}`}
                            onPress={() => router.push(`/(tabs)/health/medications/detail?id=${med.id}` as Href)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingHorizontal: theme.spacing.md,
                              paddingVertical: theme.spacing.sm,
                              gap: theme.spacing.md,
                              borderBottomWidth: idx === items.length - 1 && groupIdx < scheduleGroups.size - 1 ? 1 : 0,
                              borderBottomColor: IOS_HEALTH.separator,
                            }}
                          >
                            <View style={{ flexShrink: 0 }}>
                              <PillPreview colorLeft={left} colorRight={right} colorBg={bg} size={40} />
                            </View>
                            <Text
                              style={[theme.typography.body, { flex: 1, minWidth: 0, color: theme.colors.text.primary }]}
                              numberOfLines={2}
                            >
                              {med.display_name?.trim() || med.name}
                            </Text>
                            <View style={{ flexShrink: 0, paddingLeft: 4 }}>
                              <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: IOS_HEALTH.groupedListRadius,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.lg,
                    alignItems: "center",
                    ...IOS_HEALTH.shadow.card,
                  }}
                >
                  <FontAwesome name="medkit" size={32} color={IOS_HEALTH.blue} />
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: "center" }]}>
                    Nenhum medicamento agendado para hoje
                  </Text>
                  <Pressable
                    onPress={() => startNewMedWizard(false)}
                    style={{ marginTop: theme.spacing.md }}
                  >
                    <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Adicionar medicamento</Text>
                  </Pressable>
                </View>
              )}

              {/* Medicamentos de Uso Esporádico */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: theme.spacing.md,
                  gap: theme.spacing.sm,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, flex: 1, minWidth: 0 }}>
                  <Text
                    style={[theme.typography.title2, { color: theme.colors.text.primary, flexShrink: 1 }]}
                    numberOfLines={2}
                  >
                    Medicamentos de Uso Esporádico
                  </Text>
                  {asNeededMeds.length > 0 && (
                    <View
                      style={{
                        backgroundColor: "#FF9500",
                        borderRadius: 10,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "600" }}>{asNeededMeds.length}</Text>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={() => startNewMedWizard(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#34C759",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FontAwesome name="plus" size={14} color="#FFF" />
                </Pressable>
              </View>

              {asNeededMeds.length > 0 ? (
                <View
                  style={{
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: IOS_HEALTH.groupedListRadius,
                    overflow: "hidden",
                    marginBottom: theme.spacing.lg,
                    ...IOS_HEALTH.shadow.card,
                  }}
                >
                  {asNeededMeds.map((med, idx) => {
                    const left = med.color_left ?? "#FF3B30";
                    const right = med.color_right ?? "#FFADB0";
                    const bg = med.color_bg ?? "#FF9500";
                    return (
                      <Pressable
                        key={med.id}
                        onPress={() => openLogModal(med)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: theme.spacing.md,
                          gap: theme.spacing.md,
                          borderBottomWidth: idx < asNeededMeds.length - 1 ? 1 : 0,
                          borderBottomColor: IOS_HEALTH.separator,
                        }}
                      >
                        <View style={{ flexShrink: 0 }}>
                          <PillPreview colorLeft={left} colorRight={right} colorBg={bg} size={44} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[theme.typography.headline, { color: theme.colors.text.primary }]}
                            numberOfLines={2}
                          >
                            {med.display_name?.trim() || med.name}
                          </Text>
                          <Text style={{ fontSize: 13, color: theme.colors.text.secondary }} numberOfLines={1}>
                            {med.dosage ?? "—"} · Toque para registrar toma
                          </Text>
                        </View>
                        <View style={{ flexShrink: 0 }}>
                          <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: IOS_HEALTH.groupedListRadius,
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.lg,
                    ...IOS_HEALTH.shadow.card,
                  }}
                >
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center" }]}>
                    Nenhum medicamento de uso esporádico cadastrado
                  </Text>
                  <Pressable
                    onPress={() => startNewMedWizard(true)}
                    style={{ marginTop: theme.spacing.sm, alignItems: "center" }}
                  >
                    <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Adicionar medicamento SOS</Text>
                  </Pressable>
                </View>
              )}

              {/* Seus Medicamentos */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: theme.spacing.sm,
                  gap: theme.spacing.sm,
                }}
              >
                <Text
                  style={[theme.typography.title2, { color: theme.colors.text.primary, flex: 1 }]}
                  numberOfLines={1}
                >
                  Seus Medicamentos
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
                      ? "Quando precisar"
                      : m.repeat_mode === "interval_hours"
                        ? `A cada ${m.frequency_hours}h`
                        : m.medication_schedules?.length
                          ? `${m.medication_schedules.length} horário(s)`
                          : "Todos os dias";
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => openLogModal(m)}
                      style={{
                        borderBottomWidth: idx < medications.length - 1 ? 1 : 0,
                        borderBottomColor: IOS_HEALTH.separator,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: theme.spacing.md,
                          gap: theme.spacing.md,
                        }}
                      >
                        <View style={{ flexShrink: 0 }}>
                          <PillPreview colorLeft={left} colorRight={right} colorBg={bg} size={52} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: theme.spacing.xs }}>
                          <Text
                            style={[theme.typography.headline, { color: theme.colors.text.primary }]}
                            numberOfLines={2}
                          >
                            {m.display_name?.trim() || m.name}
                          </Text>
                          <Text
                            style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2 }]}
                            numberOfLines={1}
                          >
                            {m.form ?? "—"}
                          </Text>
                          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                            {m.dosage ?? "—"}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                            <FontAwesome name="calendar" size={12} color={theme.colors.text.tertiary} style={{ marginTop: 1 }} />
                            <Text
                              style={{ fontSize: 13, color: theme.colors.text.tertiary, flex: 1 }}
                              numberOfLines={2}
                            >
                              {scheduleText}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: IOS_HEALTH.blue, marginTop: 6, fontWeight: "600" }}>
                            Toque para registrar toma
                          </Text>
                        </View>
                        <View style={{ flexShrink: 0, alignSelf: "center" }}>
                          <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Adicionar Medicamento link */}
              <Pressable
                onPress={() => startNewMedWizard(false)}
                style={{ marginBottom: theme.spacing.lg }}
              >
                <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600", fontSize: 17 }}>Adicionar Medicamento</Text>
              </Pressable>

              {/* Mais section */}
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
                Mais
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
                <Pressable
                  onPress={() => Alert.alert("Desafixar", "Remover da tela Resumo")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: theme.spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: IOS_HEALTH.separator,
                  }}
                >
                  <Text style={[theme.typography.body, { color: theme.colors.text.primary }]}>Desafixar do Resumo</Text>
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
                    <FontAwesome name="minus" size={10} color={theme.colors.text.tertiary} />
                  </View>
                </Pressable>
                <Text style={{ fontSize: 13, color: theme.colors.text.secondary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm }}>
                  Os tópicos fixados aparecem na parte superior do Resumo.
                </Text>
                <Pressable
                  onPress={() => Alert.alert("Exportar PDF", "Funcionalidade em breve.")}
                  style={{
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: IOS_HEALTH.separator,
                  }}
                >
                  <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Exportar PDF</Text>
                </Pressable>
                <Pressable
                  onPress={() => Alert.alert("Opções", "Preferências de medicamentos em breve.")}
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
                  <Text style={[theme.typography.body, { fontWeight: "600" }]}>Opções</Text>
                  <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal: toma tomada ou não + data/hora */}
      <Modal
        visible={!!logModalMed}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setLogModalMed(null);
          setLogOutcome(null);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: theme.spacing.md }}
          onPress={() => {
            setLogModalMed(null);
            setLogOutcome(null);
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.radius.lg,
                maxHeight: 560,
              }}
              contentContainerStyle={{ padding: theme.spacing.lg }}
            >
              <Text style={[theme.typography.title2, { marginBottom: theme.spacing.sm, textAlign: "center" }]}>
                Registrar toma
              </Text>
              <Text
                style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center", marginBottom: theme.spacing.md }]}
              >
                Indique se tomou o medicamento e a data/hora do registro.
              </Text>

              {logModalMed ? (
                <View style={{ alignItems: "center", marginBottom: theme.spacing.md }}>
                  <PillPreview
                    colorLeft={logModalMed.color_left ?? "#FF3B30"}
                    colorRight={logModalMed.color_right ?? "#FFADB0"}
                    colorBg={logModalMed.color_bg ?? "#007AFF"}
                    size={64}
                  />
                  <Text style={[theme.typography.headline, { marginTop: theme.spacing.sm, textAlign: "center" }]}>
                    {logModalMed.display_name || logModalMed.name}
                  </Text>
                  <Text style={{ color: theme.colors.text.secondary, textAlign: "center" }}>{logModalMed.dosage ?? ""}</Text>
                </View>
              ) : null}

              <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
                O que aconteceu?
              </Text>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
                <Pressable
                  onPress={() => setLogOutcome("taken")}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: IOS_HEALTH.pillButtonRadius,
                    backgroundColor: logOutcome === "taken" ? "#34C759" : theme.colors.background.secondary,
                    borderWidth: logOutcome === "taken" ? 0 : 1,
                    borderColor: IOS_HEALTH.separator,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ color: logOutcome === "taken" ? "#FFF" : theme.colors.text.primary, fontWeight: "700" }}>
                    Tomei
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLogOutcome("skipped")}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: IOS_HEALTH.pillButtonRadius,
                    backgroundColor: logOutcome === "skipped" ? theme.colors.text.primary : theme.colors.background.secondary,
                    borderWidth: logOutcome === "skipped" ? 0 : 1,
                    borderColor: IOS_HEALTH.separator,
                    alignItems: "center",
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={{ color: logOutcome === "skipped" ? "#FFF" : theme.colors.text.primary, fontWeight: "700" }}>
                    Não tomei
                  </Text>
                </Pressable>
              </View>

              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }]}>
                Data
              </Text>
              <DateTimePicker
                value={logDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => {
                  if (date) setLogDate(date);
                }}
                style={{ marginBottom: theme.spacing.md }}
              />

              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }]}>
                Horário
              </Text>
              <DateTimePicker
                value={logTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, time) => {
                  if (time) setLogTime(time);
                }}
                style={{ marginBottom: theme.spacing.lg }}
              />

              {logModalMed ? (
                <Pressable
                  onPress={() => {
                    setLogModalMed(null);
                    setLogOutcome(null);
                    router.push(`/(tabs)/health/medications/detail?id=${logModalMed.id}` as Href);
                  }}
                  style={{ marginBottom: theme.spacing.lg, alignItems: "center" }}
                >
                  <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Ver ficha e horários do medicamento</Text>
                </Pressable>
              ) : null}

              <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                <Pressable
                  onPress={() => {
                    setLogModalMed(null);
                    setLogOutcome(null);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: IOS_HEALTH.pillButtonRadius,
                    backgroundColor: theme.colors.background.tertiary,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={saveMedicationLog}
                  disabled={loggingDose || logOutcome === null}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: IOS_HEALTH.pillButtonRadius,
                    backgroundColor: logOutcome === null ? theme.colors.background.tertiary : IOS_HEALTH.blue,
                    alignItems: "center",
                    opacity: loggingDose ? 0.65 : 1,
                  }}
                >
                  <Text style={{ color: logOutcome === null ? theme.colors.text.tertiary : "#FFF", fontWeight: "600" }}>
                    {loggingDose ? "A guardar..." : "Guardar"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ResponsiveScreen>
  );
}
