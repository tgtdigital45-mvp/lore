import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useVitalLogs } from "@/src/hooks/useVitalLogs";
import type { VitalType } from "@/src/types/vitalsNutrition";

const TYPES: { key: VitalType; label: string }[] = [
  { key: "temperature", label: "Temperatura (°C)" },
  { key: "heart_rate", label: "Freq. cardíaca (bpm)" },
  { key: "blood_pressure", label: "Pressão arterial (mmHg)" },
  { key: "spo2", label: "SpO2 (%)" },
  { key: "weight", label: "Peso (kg)" },
  { key: "glucose", label: "Glicemia (mg/dL)" },
];

export default function VitalLogScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/vitals" as Href);
  const { patient } = usePatient();
  const { insertLog } = useVitalLogs(patient);

  const [vitalType, setVitalType] = useState<VitalType>("temperature");
  const [valueNum, setValueNum] = useState("");
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!patient) {
      Alert.alert("Sinais vitais", "Perfil de paciente necessário.");
      return;
    }
    setSaving(true);
    try {
      if (vitalType === "blood_pressure") {
        const s = parseInt(sys, 10);
        const d = parseInt(dia, 10);
        if (!Number.isFinite(s) || !Number.isFinite(d)) {
          Alert.alert("Validação", "Indique sistólica e diastólica.");
          setSaving(false);
          return;
        }
        const { error } = await insertLog({
          vital_type: "blood_pressure",
          value_systolic: s,
          value_diastolic: d,
          unit: "mmHg",
          notes: notes.trim() || null,
        });
        if (error) Alert.alert("Erro", error.message);
        else router.replace("/(tabs)/health/vitals" as Href);
      } else {
        const v = parseFloat(valueNum.replace(",", "."));
        if (!Number.isFinite(v)) {
          Alert.alert("Validação", "Indique um valor numérico.");
          setSaving(false);
          return;
        }
        const unit =
          vitalType === "temperature"
            ? "°C"
            : vitalType === "heart_rate"
              ? "bpm"
              : vitalType === "spo2"
                ? "%"
                : vitalType === "weight"
                  ? "kg"
                  : "mg/dL";
        const { error } = await insertLog({
          vital_type: vitalType,
          value_numeric: v,
          unit,
          notes: notes.trim() || null,
        });
        if (error) Alert.alert("Erro", error.message);
        else router.replace("/(tabs)/health/vitals" as Href);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: theme.spacing.md, marginBottom: theme.spacing.md }}>
        <Pressable onPress={goBack} hitSlop={12}>
          <FontAwesome name="chevron-left" size={22} color={theme.colors.semantic.respiratory} />
        </Pressable>
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginLeft: theme.spacing.sm }]}>Novo registo</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Text style={[theme.typography.headline, { color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }]}>Tipo</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          {TYPES.map((t) => {
            const on = vitalType === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setVitalType(t.key)}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: on ? theme.colors.semantic.treatment : theme.colors.background.secondary,
                }}
              >
                <Text style={{ color: on ? "#FFF" : theme.colors.text.primary, fontWeight: "600", fontSize: 14 }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {vitalType === "blood_pressure" ? (
          <View style={{ flexDirection: "row", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Sistólica</Text>
              <TextInput
                value={sys}
                onChangeText={setSys}
                keyboardType="number-pad"
                placeholder="120"
                placeholderTextColor={theme.colors.text.tertiary}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.divider,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  color: theme.colors.text.primary,
                  fontSize: 17,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Diastólica</Text>
              <TextInput
                value={dia}
                onChangeText={setDia}
                keyboardType="number-pad"
                placeholder="80"
                placeholderTextColor={theme.colors.text.tertiary}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.divider,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  color: theme.colors.text.primary,
                  fontSize: 17,
                }}
              />
            </View>
          </View>
        ) : (
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Valor</Text>
            <TextInput
              value={valueNum}
              onChangeText={setValueNum}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.colors.text.tertiary}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
                color: theme.colors.text.primary,
                fontSize: 17,
              }}
            />
          </View>
        )}

        <View style={{ marginBottom: theme.spacing.lg }}>
          <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Notas (opcional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholderTextColor={theme.colors.text.tertiary}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              color: theme.colors.text.primary,
              fontSize: 17,
              minHeight: 80,
              textAlignVertical: "top",
            }}
          />
        </View>

        <Pressable
          onPress={() => void onSave()}
          disabled={saving}
          style={{
            backgroundColor: theme.colors.semantic.treatment,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            alignItems: "center",
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Text style={[theme.typography.headline, { color: "#FFF" }]}>{saving ? "A guardar…" : "Guardar"}</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
