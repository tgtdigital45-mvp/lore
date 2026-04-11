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
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardDoneAccessory, KEYBOARD_DONE_ACCESSORY_ID } from "@/src/components/KeyboardDoneAccessory";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { labelInfusionStatus } from "@/src/i18n/treatment";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { usePatient } from "@/src/hooks/usePatient";
import { supabase } from "@/src/lib/supabase";
import type { InfusionSessionStatus, TreatmentInfusionRow } from "@/src/types/treatment";

const STATUSES: InfusionSessionStatus[] = ["completed", "scheduled", "cancelled"];

export default function EditInfusionScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { cycleId, infusionId } = useLocalSearchParams<{ cycleId: string; infusionId: string }>();
  const { patient } = usePatient();
  const backFallback = useMemo(
    () => (cycleId ? (`/treatment/${cycleId}` as Href) : ("/treatment" as Href)),
    [cycleId]
  );
  const goBack = useStackBack(backFallback);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sessionAt, setSessionAt] = useState(new Date());
  const [status, setStatus] = useState<InfusionSessionStatus>("completed");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");

  const load = useCallback(async () => {
    if (!infusionId || !patient) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("treatment_infusions")
      .select("*")
      .eq("id", infusionId)
      .eq("patient_id", patient.id)
      .maybeSingle();
    setLoading(false);
    if (error || !data) {
      Alert.alert("Erro", error?.message ?? "Registo não encontrado.");
      goBack();
      return;
    }
    const row = data as TreatmentInfusionRow;
    setSessionAt(new Date(row.session_at));
    setStatus(row.status);
    setWeight(row.weight_kg != null ? String(row.weight_kg) : "");
    setNotes(row.notes ?? "");
  }, [infusionId, patient, goBack]);

  useEffect(() => {
    void load();
  }, [load]);

  const isScheduled = status === "scheduled";

  async function save() {
    if (!patient || !infusionId || !cycleId) return;
    Keyboard.dismiss();
    const w = weight.trim();
    let weightNum: number | null = null;
    if (w.length > 0) {
      const n = parseFloat(w.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        Alert.alert("Validação", "Peso inválido.");
        return;
      }
      weightNum = n;
    }
    setBusy(true);
    const { error } = await supabase
      .from("treatment_infusions")
      .update({
        session_at: sessionAt.toISOString(),
        status,
        weight_kg: weightNum,
        notes: notes.trim() || null,
      })
      .eq("id", infusionId)
      .eq("patient_id", patient.id);
    setBusy(false);
    if (error) {
      Alert.alert("Erro", error.message);
      return;
    }
    router.replace(`/treatment/${cycleId}` as Href);
  }

  function confirmDelete() {
    if (!patient || !infusionId || !cycleId) return;
    Alert.alert("Eliminar", "Remover este registo de infusão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("treatment_infusions").delete().eq("id", infusionId).eq("patient_id", patient.id);
          if (error) {
            Alert.alert("Erro", error.message);
            return;
          }
          router.replace(`/treatment/${cycleId}` as Href);
        },
      },
    ]);
  }

  const headerSubtitle = useMemo(() => {
    if (isScheduled) return "Reagendar: altere data e hora abaixo.";
    return "";
  }, [isScheduled]);

  if (!infusionId) {
    return null;
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
          Infusão
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
          <KeyboardDoneAccessory />
          {headerSubtitle ? (
            <Text style={[theme.typography.body, { color: IOS_HEALTH.blue, marginBottom: theme.spacing.sm }]}>{headerSubtitle}</Text>
          ) : null}

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Data e hora</Text>
          {Platform.OS === "ios" ? (
            <DateTimePicker value={sessionAt} mode="datetime" display="spinner" onChange={(_, d) => d && setSessionAt(d)} />
          ) : (
            <>
              <Pressable onPress={() => setShowPicker(true)}>
                <Text style={{ marginTop: 8, color: theme.colors.text.primary }}>
                  {sessionAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={sessionAt}
                  mode="datetime"
                  display="default"
                  onChange={(e, d) => {
                    setShowPicker(Platform.OS === "ios");
                    if (d) setSessionAt(d);
                  }}
                />
              ) : null}
            </>
          )}

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
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: status === s ? IOS_HEALTH.blue : theme.colors.background.secondary,
                }}
              >
                <Text style={{ color: status === s ? "#FFFFFF" : theme.colors.text.primary, fontSize: 13, fontWeight: "600" }}>
                  {labelInfusionStatus(s)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
            Peso (kg), opcional
          </Text>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ACCESSORY_ID : undefined}
            returnKeyType="next"
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
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_DONE_ACCESSORY_ID : undefined}
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

          <Pressable
            disabled={busy}
            onPress={() => void save()}
            style={{
              marginTop: theme.spacing.xl,
              backgroundColor: theme.colors.semantic.treatment,
              paddingVertical: 14,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              alignItems: "center",
            }}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontWeight: "600", color: "#FFFFFF", fontSize: 17 }}>Guardar</Text>}
          </Pressable>

          <Pressable onPress={confirmDelete} style={{ marginTop: theme.spacing.lg, alignItems: "center", padding: theme.spacing.md }}>
            <Text style={{ color: theme.colors.semantic.vitals, fontWeight: "600" }}>Eliminar registo</Text>
          </Pressable>
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
