import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardDoneAccessory, KEYBOARD_DONE_ACCESSORY_ID } from "@/src/components/KeyboardDoneAccessory";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { usePatient } from "@/src/hooks/usePatient";
import { predictedSessionAtIso } from "@/src/lib/treatmentInfusionSchedule";
import { supabase } from "@/src/lib/supabase";
import type { TreatmentKind } from "@/src/types/treatment";

function parseRequiredPositiveInt(s: string): number | null {
  const t = s.trim();
  if (t.length === 0) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function parseOptionalInt(s: string): number | null {
  const t = s.trim();
  if (t.length === 0) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 1–180 ou vazio (null). Valores inválidos devolvem sentinel -1. */
function parseInfusionIntervalDays(s: string): number | null | -1 {
  const t = s.trim();
  if (t.length === 0) return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < 1 || n > 180) return -1;
  return n;
}

export default function TreatmentDetailsWizardScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/treatment/name" as Href);
  const { patient } = usePatient();
  const params = useLocalSearchParams<{
    kind?: string;
    startDate?: string;
    planned?: string;
    completed?: string;
    infusionIntervalDays?: string;
    protocolName?: string;
  }>();

  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const canSave = useMemo(() => {
    const plannedOk = parseRequiredPositiveInt(String(params.planned ?? ""));
    return (
      !!patient &&
      plannedOk != null &&
      typeof params.protocolName === "string" &&
      params.protocolName.trim().length > 0 &&
      typeof params.startDate === "string" &&
      params.startDate.length >= 8
    );
  }, [patient, params]);

  async function save() {
    if (!patient || !canSave) return;
    Keyboard.dismiss();
    const kind = (params.kind ?? "other") as TreatmentKind;
    const protocolName = String(params.protocolName).trim();
    const startDate = String(params.startDate);
    const planned = parseRequiredPositiveInt(String(params.planned ?? ""));
    const completedRaw = parseOptionalInt(String(params.completed ?? ""));
    const intervalParsed = parseInfusionIntervalDays(String(params.infusionIntervalDays ?? ""));
    if (!planned) {
      Alert.alert("Validação", "Indique a quantidade de sessões (mínimo 1).");
      return;
    }
    if (planned > 1 && intervalParsed == null) {
      Alert.alert("Validação", "Com mais de uma sessão, indique o intervalo em dias entre infusões (1–180).");
      return;
    }
    if (intervalParsed === -1) {
      Alert.alert("Validação", "Intervalo entre infusões: indique um número entre 1 e 180 dias ou deixe em branco (apenas com 1 sessão).");
      return;
    }
    const completedCount =
      completedRaw != null ? Math.min(completedRaw, planned) : 0;

    const infusionRows: {
      patient_id: string;
      cycle_id: string;
      session_at: string;
      status: "scheduled" | "completed";
      weight_kg: null;
      notes: null;
    }[] = [];

    setBusy(true);
    const { data, error } = await supabase
      .from("treatment_cycles")
      .insert({
        patient_id: patient.id,
        protocol_name: protocolName,
        start_date: startDate,
        end_date: null,
        status: "active",
        treatment_kind: kind,
        notes: notes.trim() || null,
        planned_sessions: planned,
        completed_sessions: completedCount,
        infusion_interval_days: intervalParsed,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      setBusy(false);
      Alert.alert("Tratamento", error?.message ?? "Não foi possível guardar.");
      return;
    }

    const cycleId = data.id;
    for (let i = 0; i < planned; i++) {
      const iso = predictedSessionAtIso(startDate, i, intervalParsed);
      if (!iso) {
        await supabase.from("treatment_cycles").delete().eq("id", cycleId);
        setBusy(false);
        Alert.alert("Validação", "Datas das sessões inválidas. Verifique a data de início e o intervalo.");
        return;
      }
      const done = i < completedCount;
      infusionRows.push({
        patient_id: patient.id,
        cycle_id: cycleId,
        session_at: iso,
        status: done ? "completed" : "scheduled",
        weight_kg: null,
        notes: null,
      });
    }

    if (infusionRows.length > 0) {
      const { error: infErr } = await supabase.from("treatment_infusions").insert(infusionRows);
      if (infErr) {
        await supabase.from("treatment_cycles").delete().eq("id", cycleId);
        setBusy(false);
        Alert.alert("Tratamento", infErr.message ?? "Não foi possível criar os check-ins.");
        return;
      }
    }

    setBusy(false);

    Alert.alert("Tratamento", "Ciclo criado com check-ins.", [
      { text: "Concluir", onPress: () => router.replace(`/treatment/${cycleId}` as Href) },
    ]);
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
          Observações
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <KeyboardDoneAccessory />
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
          Detalhes ou notas para lembrar mais tarde (medicamentos do protocolo, reações, etc.).
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Observações opcionais"
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          numberOfLines={5}
          inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ACCESSORY_ID : undefined}
          returnKeyType="default"
          blurOnSubmit={false}
          style={{
            marginTop: theme.spacing.md,
            minHeight: 120,
            textAlignVertical: "top",
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.radius.md,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.md,
            fontSize: 17,
            color: theme.colors.text.primary,
          }}
        />

        <Pressable
          disabled={!canSave || busy}
          onPress={() => void save()}
          style={({ pressed }) => ({
            marginTop: theme.spacing.xl,
            backgroundColor: canSave && !busy ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            opacity: pressed && canSave && !busy ? 0.88 : 1,
          })}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>Guardar ciclo</Text>
          )}
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
