import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LineChart } from "react-native-gifted-charts";
import type { Href } from "expo-router";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { OncoCard } from "@/components/OncoCard";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useMedications, type MedicationRow } from "@/src/hooks/useMedications";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { recordDoseTaken } from "@/src/lib/medicationLogWrite";
import { cancelMedicationNotifications, scheduleMedicationNotifications } from "@/src/lib/medicationNotifications";
import { supabase } from "@/src/lib/supabase";
import { PillPreview } from "@/src/medications/components/PillPreview";

type MedLogRow = {
  id: string;
  medication_id: string;
  status: string | null;
  taken_time: string | null;
  scheduled_time: string | null;
  quantity: number | null;
  notes: string | null;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function logStatusLabel(status: string | null): string {
  if (status === "taken") return "Tomado";
  if (status === "skipped") return "Não tomado";
  if (status === "no_interaction") return "Sem interação";
  if (status === "pending") return "Pendente";
  return status ?? "—";
}

export default function MedicationDetailScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { patient } = usePatient();
  const qc = useQueryClient();
  const { medications, refresh } = useMedications();
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<MedLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [doseOpen, setDoseOpen] = useState(false);
  /** Gráfico + dose vs. histórico de registos */
  const [detailTab, setDetailTab] = useState<"grafico" | "dados">("grafico");
  const [logDate, setLogDate] = useState(() => new Date());
  const [logTime, setLogTime] = useState(() => new Date());
  const [logSaving, setLogSaving] = useState(false);
  /** Android: nunca montar DateTimePicker inline no modal — evita loop de diálogos nativos. */
  const [androidPicker, setAndroidPicker] = useState<null | "date" | "time">(null);

  const med = useMemo(() => medications.find((m) => m.id === id) ?? null, [id, medications]);

  const loadLogs = useCallback(async () => {
    if (!id) {
      setLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    setLogsError(null);
    const { data, error } = await supabase
      .from("medication_logs")
      .select("id, medication_id, status, taken_time, scheduled_time, quantity, notes")
      .eq("medication_id", id)
      .order("scheduled_time", { ascending: false })
      .limit(400);
    if (error) {
      setLogsError("Não foi possível carregar o histórico de tomas. Tente novamente.");
      setLogs([]);
    } else {
      setLogs((data ?? []) as MedLogRow[]);
    }
    setLogsLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs])
  );

  const chartPoints = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const byDay = new Map<string, number>();
    for (const row of logs) {
      const iso = row.taken_time ?? row.scheduled_time;
      if (!iso) continue;
      const t = new Date(iso).getTime();
      if (t < cutoff) continue;
      if (row.status === "skipped" || row.status === "no_interaction") continue;
      const k = dayKey(iso);
      byDay.set(k, (byDay.get(k) ?? 0) + (row.quantity ?? 1));
    }
    const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([dk, count]) => ({
      value: count,
      label: dk.slice(8, 10) + "/" + dk.slice(5, 7),
      dataPointText: String(count),
    }));
  }, [logs]);

  const accent = theme.colors.semantic.treatment;
  const maxVal = Math.max(1, ...chartPoints.map((p) => p.value));

  const remove = useCallback(async () => {
    if (!med) return;
    Alert.alert("Apagar medicamento", `Remover ${med.name} e o respetivo histórico de tomas?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          await cancelMedicationNotifications(med.id);
          const { error } = await supabase.from("medications").delete().eq("id", med.id);
          setBusy(false);
          if (error) {
            Alert.alert("Erro", error.message);
            return;
          }
          await refresh();
          router.replace("/(tabs)/health/medications" as Href);
        },
      },
    ]);
  }, [med, refresh, router]);

  const archive = useCallback(async () => {
    if (!med) return;
    Alert.alert("Arquivar medicamento", "Oculta da aba Medicamentos. Pode voltar a adicionar mais tarde se necessário.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Arquivar",
        onPress: async () => {
          setBusy(true);
          await cancelMedicationNotifications(med.id);
          const { error } = await supabase.from("medications").update({ archived: true }).eq("id", med.id);
          setBusy(false);
          if (error) {
            Alert.alert("Erro", error.message);
            return;
          }
          await refresh();
          router.replace("/(tabs)/health/medications" as Href);
        },
      },
    ]);
  }, [med, refresh, router]);

  const togglePin = useCallback(
    async (value: boolean) => {
      if (!med || !patient) return;
      setBusy(true);
      try {
        const { error } = await supabase.from("medications").update({ pinned: value }).eq("id", med.id);
        if (error) {
          Alert.alert("Erro", error.message);
          return;
        }
        qc.setQueryData<MedicationRow[]>(["medications", patient.id], (prev) =>
          prev?.map((m) => (m.id === med.id ? { ...m, pinned: value } : m)) ?? prev
        );
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [med, patient, qc, refresh]
  );

  async function saveDose() {
    if (!med || !patient) return;
    setLogSaving(true);
    try {
      const at = new Date(logDate);
      at.setHours(logTime.getHours(), logTime.getMinutes(), 0, 0);
      const iso = at.toISOString();
      const { error } = await recordDoseTaken({
        patientId: patient.id,
        medicationId: med.id,
        scheduledTimeIso: iso,
        takenTimeIso: iso,
      });
      if (error) throw error;
      setAndroidPicker(null);
      setDoseOpen(false);
      await loadLogs();
      await refresh();
      const full = medications.find((m) => m.id === med.id);
      if (full) await scheduleMedicationNotifications(full);
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setLogSaving(false);
    }
  }

  if (!med) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <View style={{ padding: 24 }}>
          <Text style={theme.typography.body}>Medicamento não encontrado.</Text>
          <Pressable onPress={goBack} style={{ marginTop: 16 }}>
            <Text style={{ color: IOS_HEALTH.blue }}>Voltar</Text>
          </Pressable>
        </View>
      </ResponsiveScreen>
    );
  }

  const left = med.color_left ?? "#FF3B30";
  const right = med.color_right ?? "#FFADB0";
  const bg = med.color_bg ?? "#007AFF";
  const label = med.display_name?.trim() || med.name;

  const scheduleSummary =
    med.repeat_mode === "as_needed"
      ? "Uso SOS — sem horários fixos."
      : (med.medication_schedules ?? []).length > 0
        ? med.medication_schedules!.map((s) => s.time_of_day?.slice(0, 5) ?? "—").join(", ")
        : med.repeat_mode === "interval_hours"
          ? `A cada ${med.frequency_hours} h (referência)`
          : "—";

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
            letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Pressable
          onPress={() => setDoseOpen(true)}
          hitSlop={12}
          accessibilityLabel="Nova dose"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.background.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="plus" size={18} color={accent} />
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.xl * (Platform.OS === "ios" ? 4 : 2),
        }}
      >
        {logsError ? (
          <Pressable onPress={() => void loadLogs()} style={{ marginBottom: theme.spacing.md }}>
            <Text style={[theme.typography.body, { color: "#DC2626" }]}>{logsError} Toque para tentar novamente.</Text>
          </Pressable>
        ) : null}
        <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
          <PillPreview colorLeft={left} colorRight={right} colorBg={bg} size={88} />
        </View>
        <Text style={[theme.typography.body, { textAlign: "center", color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          {[med.form, med.dosage].filter(Boolean).join(" · ") || "—"}
        </Text>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.radius.md,
            padding: 4,
            marginTop: theme.spacing.lg,
            marginBottom: theme.spacing.md,
          }}
        >
          <Pressable
            onPress={() => setDetailTab("grafico")}
            accessibilityRole="tab"
            accessibilityState={{ selected: detailTab === "grafico" }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: theme.radius.sm,
              backgroundColor: detailTab === "grafico" ? theme.colors.background.primary : "transparent",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: 14,
                color: detailTab === "grafico" ? theme.colors.text.primary : theme.colors.text.secondary,
              }}
              numberOfLines={1}
            >
              Gráfico
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDetailTab("dados")}
            accessibilityRole="tab"
            accessibilityState={{ selected: detailTab === "dados" }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: theme.radius.sm,
              backgroundColor: detailTab === "dados" ? theme.colors.background.primary : "transparent",
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "600",
                fontSize: 13,
                color: detailTab === "dados" ? theme.colors.text.primary : theme.colors.text.secondary,
              }}
              numberOfLines={2}
            >
              Dados de registro
            </Text>
          </Pressable>
        </View>

        {detailTab === "grafico" ? (
          <>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
              Tendência (doses por dia, últimos 30 dias)
            </Text>
            <OncoCard style={{ marginBottom: theme.spacing.md }}>
              {logsLoading ? (
                <ActivityIndicator color={accent} />
              ) : chartPoints.length === 0 ? (
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center", paddingVertical: theme.spacing.md }]}>
                  Sem tomas registadas ainda. Use o botão abaixo ou + no topo para registar uma dose.
                </Text>
              ) : (
                <LineChart
                  data={chartPoints}
                  width={Math.min(Dimensions.get("window").width - theme.spacing.md * 4, 360)}
                  height={180}
                  color={accent}
                  thickness={3}
                  spacing={Math.max(18, 260 / Math.max(chartPoints.length, 1))}
                  hideDataPoints={chartPoints.length > 14}
                  yAxisColor={theme.colors.border.divider}
                  xAxisColor={theme.colors.border.divider}
                  yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.colors.text.secondary, fontSize: 9 }}
                  curved
                  maxValue={maxVal}
                  noOfSections={Math.min(4, maxVal)}
                  areaChart
                  startFillColor={accent}
                  endFillColor={accent}
                  startOpacity={0.2}
                  endOpacity={0.04}
                />
              )}
            </OncoCard>
            <Pressable
              onPress={() => setDoseOpen(true)}
              style={{
                marginBottom: theme.spacing.lg,
                backgroundColor: accent,
                paddingVertical: 14,
                borderRadius: IOS_HEALTH.pillButtonRadius,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Registar nova dose</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
              Histórico
            </Text>
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.lg,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              {logsLoading ? (
                <ActivityIndicator color={accent} />
              ) : logs.length === 0 ? (
                <Text style={{ color: theme.colors.text.secondary }}>Ainda não há registos para este medicamento.</Text>
              ) : (
                logs.map((row, idx) => {
                  const sched = row.scheduled_time
                    ? new Date(row.scheduled_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                    : "—";
                  const taken =
                    row.taken_time && row.status === "taken"
                      ? new Date(row.taken_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                      : null;
                  return (
                    <View
                      key={row.id}
                      style={{
                        marginBottom: idx < logs.length - 1 ? theme.spacing.md : 0,
                        paddingBottom: theme.spacing.sm,
                        borderBottomWidth: idx < logs.length - 1 ? 1 : 0,
                        borderBottomColor: IOS_HEALTH.separator,
                      }}
                    >
                      <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>{logStatusLabel(row.status)}</Text>
                      <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>
                        Agendado: {sched}
                        {taken ? ` · Registado: ${taken}` : ""}
                        {row.quantity != null && row.quantity > 1 ? ` · Qtd ${row.quantity}` : ""}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
          Horários para notificação
        </Text>
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Text style={{ color: theme.colors.text.primary }}>{scheduleSummary}</Text>
          <Text style={{ fontSize: 13, color: theme.colors.text.tertiary, marginTop: 8 }}>
            Lembretes locais quando aplicável (medicamentos com horários fixos).
          </Text>
        </View>

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Detalhes</Text>
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Nome</Text>
          <Text style={{ color: theme.colors.text.primary, fontWeight: "600", marginBottom: 8 }}>{med.name}</Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Apresentação</Text>
          <Text style={{ color: theme.colors.text.primary, marginBottom: 8 }}>{med.form ?? "—"}</Text>
          <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Dosagem</Text>
          <Text style={{ color: theme.colors.text.primary, marginBottom: 8 }}>{med.dosage ?? "—"}</Text>
          {med.notes ? (
            <>
              <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>Notas</Text>
              <Text style={{ color: theme.colors.text.primary }}>{med.notes}</Text>
            </>
          ) : null}
          <View style={{ marginTop: theme.spacing.md }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: Platform.OS === "ios" ? 44 : undefined,
              }}
            >
              <Text style={[theme.typography.headline, { flex: 1, paddingRight: theme.spacing.sm }]}>Fixar no resumo</Text>
              <Switch
                value={Boolean(med.pinned)}
                onValueChange={togglePin}
                disabled={busy}
                trackColor={{
                  false: theme.colors.background.tertiary,
                  true: theme.colors.semantic.nutrition,
                }}
                thumbColor={Platform.OS === "android" ? (med.pinned ? "#fff" : "#f4f3f4") : undefined}
                ios_backgroundColor={theme.colors.background.tertiary}
              />
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginTop: 6 }}>
              No Resumo, aparece no cartão «Medicamentos fixados» com o mesmo formato de «Próximas doses» (horário e «Marcar como tomado»). Se for também a dose mais próxima de todos os medicamentos, só aparece em «Próximas doses» para não duplicar. O fixar no rodapé da aba Medicamentos é o atalho geral da área.
            </Text>
          </View>
        </View>

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Sobre</Text>
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.md,
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Text style={{ color: theme.colors.text.secondary }}>
            Este registo serve para lembretes e histórico seu. Ajuste de tratamento é sempre com a equipa de saúde.
          </Text>
        </View>

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Opções</Text>
        <Pressable
          onPress={remove}
          disabled={busy}
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            borderWidth: 1,
            borderColor: IOS_HEALTH.separator,
          }}
        >
          <Text style={{ color: IOS_HEALTH.destructive, fontWeight: "700", textAlign: "center" }}>Apagar medicamento</Text>
        </Pressable>
        <Pressable
          onPress={archive}
          disabled={busy}
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: IOS_HEALTH.separator,
          }}
        >
          <Text style={{ color: theme.colors.text.primary, fontWeight: "700", textAlign: "center" }}>Arquivar medicamento</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={doseOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAndroidPicker(null);
          setDoseOpen(false);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: theme.spacing.md }}
          onPress={() => {
            setAndroidPicker(null);
            setDoseOpen(false);
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: theme.colors.background.primary, borderRadius: theme.radius.lg, padding: theme.spacing.lg }}>
            <Text style={[theme.typography.title2, { marginBottom: theme.spacing.md, textAlign: "center" }]}>Registar dose</Text>
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
                  <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, textAlign: "center", marginTop: 4 }}>Toque para alterar</Text>
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
                  <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, textAlign: "center", marginTop: 4 }}>Toque para alterar</Text>
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
                  setDoseOpen(false);
                }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: IOS_HEALTH.pillButtonRadius, backgroundColor: theme.colors.background.tertiary, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={saveDose}
                disabled={logSaving}
                style={{ flex: 1, paddingVertical: 14, borderRadius: IOS_HEALTH.pillButtonRadius, backgroundColor: IOS_HEALTH.blue, alignItems: "center", opacity: logSaving ? 0.7 : 1 }}
              >
                <Text style={{ color: "#FFF", fontWeight: "600" }}>{logSaving ? "A guardar…" : "Guardar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ResponsiveScreen>
  );
}
