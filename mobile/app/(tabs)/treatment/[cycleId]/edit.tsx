import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import { supabase } from "@/src/lib/supabase";
import type { TreatmentCycleRow } from "@/src/types/treatment";

const STATUSES = ["active", "completed", "suspended"] as const;

export default function TreatmentCycleEditScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { cycleId } = useLocalSearchParams<{ cycleId: string }>();
  const backFallback = useMemo(
    () => (cycleId ? (`/treatment/${cycleId}` as Href) : ("/treatment" as Href)),
    [cycleId]
  );
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
  const [endDate, setEndDate] = useState("");
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
    setProtocolName(c.protocol_name);
    setNotes(c.notes ?? "");
    setPlanned(c.planned_sessions != null ? String(c.planned_sessions) : "");
    setCompleted(c.completed_sessions != null ? String(c.completed_sessions) : "");
    setStatus(c.status);
    setEndDate(c.end_date ? String(c.end_date).split("T")[0] : "");
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
    if (!pn) {
      Alert.alert("Validação", "Indique o nome do ciclo.");
      return;
    }
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
        planned_sessions: plannedN,
        completed_sessions: completedN,
        status,
        end_date: endDate.trim() === "" ? null : endDate.trim(),
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
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Nome do ciclo</Text>
          <TextInput
            value={protocolName}
            onChangeText={setProtocolName}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => Keyboard.dismiss()}
            style={{
              marginTop: theme.spacing.xs,
              backgroundColor: theme.colors.background.secondary,
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
            style={{
              marginTop: theme.spacing.xs,
              minHeight: 80,
              textAlignVertical: "top",
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              fontSize: 17,
              color: theme.colors.text.primary,
            }}
          />

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
            Dias entre infusões (protocolo, opcional)
          </Text>
          <Text style={[theme.typography.body, { fontSize: 13, color: theme.colors.text.tertiary, marginTop: 4 }]}>
            Usado para sugerir a próxima data após cada infusão concluída (1–180).
          </Text>
          <TextInput
            value={infusionIntervalDays}
            onChangeText={setInfusionIntervalDays}
            placeholder="Ex.: 7, 14, 21…"
            keyboardType="number-pad"
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => Keyboard.dismiss()}
            style={{
              marginTop: theme.spacing.xs,
              backgroundColor: theme.colors.background.secondary,
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
              onSubmitEditing={() => Keyboard.dismiss()}
              style={{
                flex: 1,
                backgroundColor: theme.colors.background.secondary,
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
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              style={{
                flex: 1,
                backgroundColor: theme.colors.background.secondary,
                borderRadius: IOS_HEALTH.pillButtonRadius,
                paddingVertical: 12,
                paddingHorizontal: theme.spacing.md,
                fontSize: 17,
                color: theme.colors.text.primary,
              }}
            />
          </View>

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
            Estado
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: status === s ? IOS_HEALTH.blue : theme.colors.background.secondary,
                }}
              >
                <Text style={{ color: status === s ? "#FFFFFF" : theme.colors.text.primary, fontWeight: "600" }}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
            Data de fim (AAAA-MM-DD, opcional)
          </Text>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-12-31"
            autoCapitalize="none"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
            style={{
              marginTop: theme.spacing.xs,
              backgroundColor: theme.colors.background.secondary,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              paddingVertical: 12,
              paddingHorizontal: theme.spacing.md,
              fontSize: 17,
              color: theme.colors.text.primary,
            }}
          />

          <Pressable
            disabled={saving}
            onPress={() => void save()}
            style={({ pressed }) => ({
              marginTop: theme.spacing.xl,
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
