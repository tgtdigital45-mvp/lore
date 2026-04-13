import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useNutritionLogs } from "@/src/hooks/useNutritionLogs";
import type { NutritionLogType } from "@/src/types/vitalsNutrition";

const LOG_TYPES: { key: NutritionLogType; label: string }[] = [
  { key: "water", label: "Água (copos)" },
  { key: "coffee", label: "Café" },
  { key: "meal", label: "Refeição" },
  { key: "calories", label: "Calorias (kcal)" },
  { key: "appetite", label: "Apetite (0–10)" },
];

export default function NutritionLogScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/nutrition" as Href);
  const { patient } = usePatient();
  const { insertLog } = useNutritionLogs(patient);

  const [logType, setLogType] = useState<NutritionLogType>("water");
  const [quantity, setQuantity] = useState("1");
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [appetite, setAppetite] = useState("5");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!patient) {
      Alert.alert("Nutrição", "Perfil necessário.");
      return;
    }
    setSaving(true);
    try {
      if (logType === "water" || logType === "coffee") {
        const q = parseInt(quantity, 10);
        if (!Number.isFinite(q) || q < 1) {
          Alert.alert("Validação", "Indique uma quantidade válida.");
          setSaving(false);
          return;
        }
        const { error } = await insertLog({ log_type: logType, quantity: q, notes: notes.trim() || null });
        if (error) Alert.alert("Erro", error.message);
        else router.replace("/(tabs)/health/nutrition" as Href);
      } else if (logType === "meal") {
        const k = calories.trim() ? parseInt(calories, 10) : null;
        const { error } = await insertLog({
          log_type: "meal",
          meal_name: mealName.trim() || "Refeição",
          calories: k != null && Number.isFinite(k) ? k : null,
          protein_g: protein.trim() ? parseInt(protein, 10) : null,
          carbs_g: carbs.trim() ? parseInt(carbs, 10) : null,
          fat_g: fat.trim() ? parseInt(fat, 10) : null,
          notes: notes.trim() || null,
        });
        if (error) Alert.alert("Erro", error.message);
        else router.replace("/(tabs)/health/nutrition" as Href);
      } else if (logType === "calories") {
        const k = parseInt(calories, 10);
        if (!Number.isFinite(k)) {
          Alert.alert("Validação", "Indique calorias.");
          setSaving(false);
          return;
        }
        const { error } = await insertLog({ log_type: "calories", calories: k, notes: notes.trim() || null });
        if (error) Alert.alert("Erro", error.message);
        else router.replace("/(tabs)/health/nutrition" as Href);
      } else {
        const a = parseInt(appetite, 10);
        if (!Number.isFinite(a) || a < 0 || a > 10) {
          Alert.alert("Validação", "Apetite entre 0 e 10.");
          setSaving(false);
          return;
        }
        const { error } = await insertLog({ log_type: "appetite", appetite_level: a, notes: notes.trim() || null });
        if (error) Alert.alert("Erro", error.message);
        else router.replace("/(tabs)/health/nutrition" as Href);
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
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginLeft: theme.spacing.sm }]}>Novo registro</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Text style={[theme.typography.headline, { color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }]}>Tipo</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          {LOG_TYPES.map((t) => {
            const on = logType === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setLogType(t.key)}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: on ? theme.colors.semantic.nutrition : theme.colors.background.secondary,
                }}
              >
                <Text style={{ color: on ? "#FFF" : theme.colors.text.primary, fontWeight: "600", fontSize: 13 }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {(logType === "water" || logType === "coffee") && (
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Quantidade</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
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

        {logType === "meal" && (
          <>
            <Field label="Nome da refeição" theme={theme} value={mealName} onChangeText={setMealName} placeholder="Ex.: Almoço" />
            <Field label="Calorias (opcional)" theme={theme} value={calories} onChangeText={setCalories} keyboardType="number-pad" />
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Prot (g)</Text>
                <TextInput
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="number-pad"
                  style={inputStyle(theme)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Carb (g)</Text>
                <TextInput value={carbs} onChangeText={setCarbs} keyboardType="number-pad" style={inputStyle(theme)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Lip (g)</Text>
                <TextInput value={fat} onChangeText={setFat} keyboardType="number-pad" style={inputStyle(theme)} />
              </View>
            </View>
          </>
        )}

        {logType === "calories" && (
          <Field label="Calorias (kcal)" theme={theme} value={calories} onChangeText={setCalories} keyboardType="number-pad" />
        )}

        {logType === "appetite" && (
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>Apetite 0–10</Text>
            <TextInput
              value={appetite}
              onChangeText={setAppetite}
              keyboardType="number-pad"
              style={inputStyle(theme)}
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
            style={[inputStyle(theme), { minHeight: 72, textAlignVertical: "top" }]}
          />
        </View>

        <Pressable
          onPress={() => void onSave()}
          disabled={saving}
          style={{
            backgroundColor: theme.colors.semantic.nutrition,
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

function inputStyle(theme: {
  colors: { border: { divider: string }; text: { primary: string } };
  spacing: { md: number };
  radius: { md: number };
}) {
  return {
    borderWidth: 1,
    borderColor: theme.colors.border.divider,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.text.primary,
    fontSize: 17,
  };
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  theme,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
  theme: {
    colors: { border: { divider: string }; text: { primary: string; secondary: string; tertiary: string } };
    spacing: { md: number };
    radius: { md: number };
  };
}) {
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text style={{ color: theme.colors.text.secondary, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        keyboardType={keyboardType}
        style={inputStyle(theme)}
      />
    </View>
  );
}
