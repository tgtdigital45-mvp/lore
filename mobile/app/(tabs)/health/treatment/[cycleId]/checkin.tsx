import { useCallback, useEffect, useMemo, useState } from "react";
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
import { supabase } from "@/src/lib/supabase";
import { reschedulePendingSessionAtsAfterCheckIn } from "@/src/lib/treatmentInfusionSchedule";
import type { TreatmentInfusionRow } from "@/src/types/treatment";

export default function TreatmentCheckInScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { cycleId, infusionId } = useLocalSearchParams<{ cycleId: string; infusionId: string }>();
  const { patient } = usePatient();
  const backFallback = useMemo(
    () => (cycleId ? treatmentCycleHref(cycleId) : TREATMENT_HREF.index),
    [cycleId]
  );
  const goBack = useStackBack(backFallback);

  const [infusion, setInfusion] = useState<TreatmentInfusionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!patient || !cycleId || !infusionId) {
      setInfusion(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("treatment_infusions")
      .select("id, patient_id, cycle_id, session_at, status, weight_kg, notes, created_at, updated_at")
      .eq("id", infusionId)
      .eq("cycle_id", cycleId)
      .eq("patient_id", patient.id)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      setInfusion(null);
      return;
    }
    setInfusion(data as TreatmentInfusionRow);
  }, [patient, cycleId, infusionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canSubmit = useMemo(() => {
    return !!infusion && infusion.status === "scheduled" && !busy;
  }, [infusion, busy]);

  async function submit() {
    if (!patient || !cycleId || !infusionId || !infusion || infusion.status !== "scheduled") return;
    Keyboard.dismiss();
    const w = weight.trim();
    if (w.length === 0) {
      Alert.alert("Validação", "Indique o peso (kg) para concluir o check-in.");
      return;
    }
    const n = parseFloat(w.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n >= 500) {
      Alert.alert("Validação", "Peso inválido.");
      return;
    }

    const nowIso = new Date().toISOString();
    setBusy(true);
    const { error } = await supabase
      .from("treatment_infusions")
      .update({
        status: "completed",
        session_at: nowIso,
        weight_kg: n,
        notes: notes.trim() || null,
      })
      .eq("id", infusionId)
      .eq("patient_id", patient.id)
      .eq("status", "scheduled");
    if (error) {
      setBusy(false);
      Alert.alert("Erro", error.message);
      return;
    }

    const { data: cycleRow } = await supabase
      .from("treatment_cycles")
      .select("infusion_interval_days")
      .eq("id", cycleId)
      .eq("patient_id", patient.id)
      .maybeSingle();
    const intervalDays = cycleRow?.infusion_interval_days;
    if (intervalDays != null && intervalDays >= 1) {
      const { data: pendingRows, error: pendErr } = await supabase
        .from("treatment_infusions")
        .select("id")
        .eq("cycle_id", cycleId)
        .eq("patient_id", patient.id)
        .eq("status", "scheduled")
        .order("session_at", { ascending: true });
      if (!pendErr && pendingRows?.length) {
        const updates = reschedulePendingSessionAtsAfterCheckIn(nowIso, intervalDays, pendingRows as { id: string }[]);
        const results = await Promise.all(
          updates.map((u) =>
            supabase.from("treatment_infusions").update({ session_at: u.session_at }).eq("id", u.id).eq("patient_id", patient.id)
          )
        );
        const batchErr = results.find((r) => r.error)?.error;
        if (batchErr) {
          setBusy(false);
          Alert.alert("Erro", batchErr.message ?? "Não foi possível reagendar todas as sessões.");
          return;
        }
      }
    }

    const { count, error: cErr } = await supabase
      .from("treatment_infusions")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .eq("status", "completed");
    if (cErr) {
      setBusy(false);
      Alert.alert("Aviso", cErr.message ?? "Não foi possível atualizar o contador de sessões concluídas.");
      router.back();
      return;
    }
    if (count != null) {
      const { error: upErr } = await supabase
        .from("treatment_cycles")
        .update({ completed_sessions: count })
        .eq("id", cycleId)
        .eq("patient_id", patient.id);
      if (upErr) {
        setBusy(false);
        Alert.alert(
          "Aviso",
          "Check-in registado, mas o contador do ciclo não foi atualizado: " + (upErr.message ?? "erro desconhecido.")
        );
        router.back();
        return;
      }
    }

    setBusy(false);

    router.back();
  }

  if (!cycleId || !infusionId) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <Text style={{ padding: 16 }}>Parâmetros em falta.</Text>
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
          style={[theme.typography.headline, { flex: 1, textAlign: "center", color: theme.colors.text.primary }]}
          numberOfLines={1}
        >
          Check-in
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: 24 }} />
      ) : !infusion ? (
        <Text style={{ padding: theme.spacing.md, color: theme.colors.text.secondary }}>Sessão não encontrada.</Text>
      ) : infusion.status !== "scheduled" ? (
        <Text style={{ padding: theme.spacing.md, color: theme.colors.text.secondary }}>
          Esta sessão já foi registrada ou não está pendente de check-in.
        </Text>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: "transparent" }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <KeyboardAccessoryDone />
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
            Data prevista:{" "}
            {new Date(infusion.session_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Ao confirmar, gravamos a data e hora exatas deste momento.
          </Text>

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.lg }]}>
            Peso (kg)
          </Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            placeholder="Ex.: 72,5"
            keyboardType="decimal-pad"
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
            returnKeyType="next"
            placeholderTextColor={theme.colors.text.tertiary}
            style={{
              marginTop: theme.spacing.xs,
              backgroundColor: theme.colors.background.secondary,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              paddingVertical: 14,
              paddingHorizontal: theme.spacing.md,
              fontSize: 17,
              color: theme.colors.text.primary,
            }}
          />

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
            Observação (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Como se sentiu, efeitos, notas para o médico…"
            placeholderTextColor={theme.colors.text.tertiary}
            multiline
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
            style={{
              marginTop: theme.spacing.xs,
              minHeight: 100,
              textAlignVertical: "top",
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              fontSize: 17,
              color: theme.colors.text.primary,
            }}
          />

          <Pressable
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={({ pressed }) => ({
              marginTop: theme.spacing.xl,
              backgroundColor: canSubmit ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
              paddingVertical: 14,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              alignItems: "center",
              opacity: pressed && canSubmit ? 0.88 : 1,
            })}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>Confirmar check-in</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
