import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { TREATMENT_HREF, treatmentCycleHref } from "@/src/navigation/treatmentRoutes";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import { supabase } from "@/src/lib/supabase";
import type { TreatmentCycleRow } from "@/src/types/treatment";
import type { AppTheme } from "@/src/theme/theme";

const STATUSES = ["active", "completed", "suspended"] as const;

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdToLocalNoon(ymd: string | null | undefined): Date {
  if (!ymd) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }
  const part = String(ymd).split("T")[0]!;
  const segs = part.split("-");
  if (segs.length !== 3) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }
  return new Date(Number(segs[0]), Number(segs[1])! - 1, Number(segs[2]), 12, 0, 0, 0);
}

function SectionCard({
  theme,
  title,
  icon,
  children,
}: {
  theme: AppTheme;
  title: string;
  icon: keyof typeof FontAwesome.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        }}
      >
        <FontAwesome name={icon} size={18} color={IOS_HEALTH.blue} />
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, flex: 1 }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function TreatmentCycleEditScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { cycleId } = useLocalSearchParams<{ cycleId: string }>();
  const backFallback = cycleId ? treatmentCycleHref(cycleId) : TREATMENT_HREF.index;
  const goBack = useStackBack(backFallback);
  const { patient } = usePatient();
  const { refresh } = useTreatmentCycles(patient);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocolName, setProtocolName] = useState("");
  const [notes, setNotes] = useState("");
  const [planned, setPlanned] = useState("");
  const [completed, setCompleted] = useState("");
  const [status, setStatus] = useState<string>("active");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(Platform.OS === "ios");
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [infusionIntervalDays, setInfusionIntervalDays] = useState("");

  const load = useCallback(async () => {
    if (!cycleId || !patient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("treatment_cycles")
      .select("*")
      .eq("id", cycleId)
      .eq("patient_id", patient.id)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      Alert.alert("Erro", error?.message ?? "Ciclo não encontrado.");
      goBack();
      return;
    }
    const c = data as TreatmentCycleRow;
    setProtocolName(c.protocol_name ?? "");
    setNotes(c.notes ?? "");
    setPlanned(c.planned_sessions != null ? String(c.planned_sessions) : "");
    setCompleted(c.completed_sessions != null ? String(c.completed_sessions) : "");
    setStatus(c.status);
    setStartDate(parseYmdToLocalNoon(c.start_date));
    if (c.end_date) {
      setEndDate(parseYmdToLocalNoon(c.end_date));
    } else {
      setEndDate(null);
    }
    setInfusionIntervalDays(
      c.infusion_interval_days != null && c.infusion_interval_days >= 1 ? String(c.infusion_interval_days) : ""
    );
  }, [cycleId, patient, goBack]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!cycleId || !patient) return;
    Keyboard.dismiss();
    const pn = protocolName.trim();
    const plannedN = planned.trim() === "" ? null : parseInt(planned, 10);
    const completedN = completed.trim() === "" ? null : parseInt(completed, 10);
    if (planned !== "" && (plannedN == null || plannedN < 0)) {
      Alert.alert("Validação", "Sessões planejadas inválidas.");
      return;
    }
    if (completed !== "" && (completedN == null || completedN < 0)) {
      Alert.alert("Validação", "Sessões realizadas inválidas.");
      return;
    }
    const iv = infusionIntervalDays.trim();
    let intervalN: number | null = null;
    if (iv.length > 0) {
      const n = parseInt(iv, 10);
      if (!Number.isFinite(n) || n < 1 || n > 180) {
        Alert.alert("Validação", "Intervalo entre infusões: 1 a 180 dias ou vazio.");
        return;
      }
      intervalN = n;
    }
    setSaving(true);
    const { error } = await supabase
      .from("treatment_cycles")
      .update({
        protocol_name: pn,
        notes: notes.trim() || null,
        start_date: toDateOnly(startDate),
        planned_sessions: plannedN,
        completed_sessions: completedN,
        status,
        end_date: endDate == null ? null : toDateOnly(endDate),
        infusion_interval_days: intervalN,
      })
      .eq("id", cycleId)
      .eq("patient_id", patient.id);
    setSaving(false);
    if (error) {
      Alert.alert("Erro", error.message);
      return;
    }
    await refresh();
    goBack();
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
        <Text style={[theme.typography.headline, { flex: 1, textAlign: "center", color: theme.colors.text.primary }]}>
          Editar ciclo
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: "transparent" }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <KeyboardAccessoryDone />

          <SectionCard theme={theme} title="Protocolo" icon="medkit">
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Nome do protocolo</Text>
            <TextInput
              value={protocolName}
              onChangeText={setProtocolName}
              placeholder="Ex.: FOLFOX, AC-T…"
              inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
              placeholderTextColor={theme.colors.text.tertiary}
              style={{
                marginTop: theme.spacing.xs,
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.pillButtonRadius,
                paddingVertical: 12,
                paddingHorizontal: theme.spacing.md,
                fontSize: 17,
                color: theme.colors.text.primary,
              }}
            />
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
              Observações
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
              placeholderTextColor={theme.colors.text.tertiary}
              style={{
                marginTop: theme.spacing.xs,
                minHeight: 80,
                textAlignVertical: "top",
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
                fontSize: 17,
                color: theme.colors.text.primary,
              }}
            />
          </SectionCard>

          <SectionCard theme={theme} title="Datas" icon="calendar">
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Início do ciclo</Text>
            {Platform.OS === "ios" ? (
              <DateTimePicker value={startDate} mode="date" display="spinner" onChange={(_, d) => d && setStartDate(d)} />
            ) : (
              <>
                <Pressable
                  onPress={() => setShowStartPicker(true)}
                  style={{ marginTop: theme.spacing.xs, paddingVertical: 8 }}
                >
                  <Text style={[theme.typography.body, { color: theme.colors.text.primary, fontWeight: "600" }]}>
                    {startDate.toLocaleDateString("pt-BR")}
                  </Text>
                </Pressable>
                {showStartPicker ? (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowStartPicker(Platform.OS === "ios");
                      if (d) setStartDate(d);
                    }}
                  />
                ) : null}
              </>
            )}

            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
              Data de fim (opcional)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
              <Pressable
                onPress={() => (endDate == null ? setEndDate(new Date(startDate)) : setEndDate(null))}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: endDate == null ? IOS_HEALTH.blue : theme.colors.background.primary,
                }}
              >
                <Text style={{ color: endDate == null ? "#FFFFFF" : theme.colors.text.primary, fontSize: 13, fontWeight: "600" }}>
                  Sem data de fim
                </Text>
              </Pressable>
            </View>
            {endDate != null ? (
              Platform.OS === "ios" ? (
                <DateTimePicker value={endDate} mode="date" display="spinner" onChange={(_, d) => d && setEndDate(d)} />
              ) : (
                <>
                  <Pressable onPress={() => setShowEndPicker(true)} style={{ marginTop: theme.spacing.xs, paddingVertical: 8 }}>
                    <Text style={[theme.typography.body, { color: theme.colors.text.primary, fontWeight: "600" }]}>
                      {endDate.toLocaleDateString("pt-BR")}
                    </Text>
                  </Pressable>
                  {showEndPicker ? (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={(e, d) => {
                        setShowEndPicker(Platform.OS === "ios");
                        if (d) setEndDate(d);
                      }}
                    />
                  ) : null}
                </>
              )
            ) : null}
          </SectionCard>

          <SectionCard theme={theme} title="Intervalo e sessões" icon="refresh">
            <Text style={[theme.typography.caption1, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.xs }]}>
              Intervalo usado para sugerir a próxima data após cada infusão (1–180 dias).
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Dias entre infusões</Text>
            <TextInput
              value={infusionIntervalDays}
              onChangeText={setInfusionIntervalDays}
              placeholder="Ex.: 7, 14, 21…"
              keyboardType="number-pad"
              inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
              returnKeyType="next"
              placeholderTextColor={theme.colors.text.tertiary}
              style={{
                marginTop: theme.spacing.xs,
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.pillButtonRadius,
                paddingVertical: 12,
                paddingHorizontal: theme.spacing.md,
                fontSize: 17,
                color: theme.colors.text.primary,
              }}
            />

            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
              Sessões planejadas / realizadas
            </Text>
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
              <TextInput
                value={planned}
                onChangeText={setPlanned}
                placeholder="Planejadas"
                keyboardType="number-pad"
                inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
                returnKeyType="next"
                placeholderTextColor={theme.colors.text.tertiary}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: IOS_HEALTH.pillButtonRadius,
                  paddingVertical: 12,
                  paddingHorizontal: theme.spacing.md,
                  fontSize: 17,
                  color: theme.colors.text.primary,
                }}
              />
              <TextInput
                value={completed}
                onChangeText={setCompleted}
                placeholder="Realizadas"
                keyboardType="number-pad"
                inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
                returnKeyType="done"
                placeholderTextColor={theme.colors.text.tertiary}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: IOS_HEALTH.pillButtonRadius,
                  paddingVertical: 12,
                  paddingHorizontal: theme.spacing.md,
                  fontSize: 17,
                  color: theme.colors.text.primary,
                }}
              />
            </View>
          </SectionCard>

          <SectionCard theme={theme} title="Estado" icon="circle">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
              {STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: status === s ? IOS_HEALTH.blue : theme.colors.background.primary,
                  }}
                >
                  <Text style={{ color: status === s ? "#FFFFFF" : theme.colors.text.primary, fontWeight: "600" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </SectionCard>

          <Pressable
            disabled={saving}
            onPress={() => void save()}
            style={({ pressed }) => ({
              marginTop: theme.spacing.sm,
              backgroundColor: theme.colors.semantic.treatment,
              paddingVertical: 14,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              alignItems: "center",
              opacity: pressed && !saving ? 0.88 : 1,
            })}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>Guardar</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
