import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LineChart, BarChart } from "react-native-gifted-charts";
import { OncoCard } from "@/components/OncoCard";
import { ToxicityHeatmap } from "@/components/ToxicityHeatmap";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { labelSeverity, labelSymptomCategory } from "@/src/i18n/ui";
import { supabase } from "@/src/lib/supabase";

const CATEGORIES = ["nausea", "fever", "fatigue", "diarrhea", "pain", "hydration"] as const;
const SEVERITIES = ["mild", "moderate", "severe", "life_threatening"] as const;

export default function DiaryScreen() {
  const { theme } = useAppTheme();
  const { patient, refresh } = usePatient();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("fatigue");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("mild");
  const [temperature, setTemperature] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<
    { id: string; symptom_category: string; severity: string; body_temperature: number | null; logged_at: string }[]
  >([]);

  const loadLogs = useCallback(async () => {
    if (!patient) return;
    const { data, error } = await supabase
      .from("symptom_logs")
      .select("id, symptom_category, severity, body_temperature, logged_at")
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(200);
    if (!error && data) setLogs(data as typeof logs);
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs])
  );

  async function submit() {
    if (!patient) {
      Alert.alert("Diário", "Complete o cadastro do paciente antes.");
      return;
    }
    setBusy(true);
    const temp =
      category === "fever" && temperature.trim() !== "" ? parseFloat(temperature.replace(",", ".")) : null;
    const { error } = await supabase.from("symptom_logs").insert({
      patient_id: patient.id,
      symptom_category: category,
      severity,
      body_temperature: Number.isFinite(temp as number) ? temp : null,
      logged_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      Alert.alert("Diário", error.message);
      return;
    }
    setTemperature("");
    await loadLogs();
    await refresh();
  }

  const lineData = useMemo(() => {
    const fevers = logs.filter((l) => l.symptom_category === "fever" && l.body_temperature != null);
    const last7 = fevers.slice(0, 7).reverse();
    return last7.map((l, i) => ({
      value: Number(l.body_temperature),
      label: String(i + 1),
      dataPointText: `${l.body_temperature}°`,
    }));
  }, [logs]);

  const barData = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs.slice(0, 30)) {
      const day = l.logged_at.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    const entries = [...map.entries()].slice(-14);
    return entries.map(([label, value]) => ({ value, label: label.slice(5) }));
  }, [logs]);

  if (!patient) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <View style={{ flex: 1, paddingVertical: theme.spacing.md }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Diário</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Complete o cadastro em Resumo para registrar sintomas.
          </Text>
        </View>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      >
      <View style={{ paddingVertical: theme.spacing.md }}>
        <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>Diário</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
          Registre sintomas e veja tendências (últimos dias).
        </Text>
      </View>

      <View>
        <OncoCard>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Novo registro</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
            Categoria
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: theme.spacing.sm }}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  marginRight: theme.spacing.sm,
                  marginBottom: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: category === c ? theme.colors.semantic.symptoms : theme.colors.background.tertiary,
                }}
              >
                <Text style={{ color: theme.colors.text.primary }}>{labelSymptomCategory(c)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
            Intensidade
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: theme.spacing.sm }}>
            {SEVERITIES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSeverity(s)}
                style={{
                  marginRight: theme.spacing.sm,
                  marginBottom: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: severity === s ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                }}
              >
                <Text style={{ color: theme.colors.text.primary }}>{labelSeverity(s)}</Text>
              </Pressable>
            ))}
          </View>

          {category === "fever" && (
            <TextInput
              placeholder="Temperatura °C (ex: 37.6)"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.text.tertiary}
              value={temperature}
              onChangeText={setTemperature}
              style={{
                marginTop: theme.spacing.md,
                borderRadius: theme.radius.md,
                padding: theme.spacing.md,
                backgroundColor: theme.colors.background.tertiary,
                color: theme.colors.text.primary,
              }}
            />
          )}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.semantic.symptoms,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: "center",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Salvar</Text>
          </Pressable>
        </OncoCard>

        {logs.length > 0 && (
          <OncoCard style={{ marginTop: theme.spacing.lg }}>
            <ToxicityHeatmap logs={logs.map((l) => ({ severity: l.severity, logged_at: l.logged_at }))} />
          </OncoCard>
        )}

        {lineData.length > 0 && (
          <OncoCard style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Febre (°C)</Text>
            <LineChart
              data={lineData}
              color={theme.colors.semantic.vitals}
              thickness={3}
              startFillColor={theme.colors.semantic.vitals}
              endFillColor={theme.colors.semantic.vitals}
              startOpacity={0.4}
              endOpacity={0.05}
              spacing={36}
              hideDataPoints={false}
              yAxisColor={theme.colors.border.divider}
              xAxisColor={theme.colors.border.divider}
              yAxisTextStyle={{ color: theme.colors.text.secondary }}
              xAxisLabelTextStyle={{ color: theme.colors.text.secondary }}
              curved
              areaChart
            />
          </OncoCard>
        )}

        {barData.length > 0 && (
          <OncoCard style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Frequência diária</Text>
            <BarChart
              barWidth={22}
              spacing={12}
              noOfSections={4}
              barBorderRadius={6}
              frontColor={theme.colors.semantic.respiratory}
              data={barData}
              yAxisColor={theme.colors.border.divider}
              xAxisColor={theme.colors.border.divider}
              yAxisTextStyle={{ color: theme.colors.text.secondary }}
              xAxisLabelTextStyle={{ color: theme.colors.text.secondary }}
            />
          </OncoCard>
        )}

        <OncoCard style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Últimos registros</Text>
          {logs.slice(0, 10).map((l) => (
            <View key={l.id} style={{ marginTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border.divider, paddingTop: theme.spacing.md }}>
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                {labelSymptomCategory(l.symptom_category)} · {labelSeverity(l.severity)}
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                {new Date(l.logged_at).toLocaleString("pt-BR")}
                {l.body_temperature != null ? ` · ${l.body_temperature}°C` : ""}
              </Text>
            </View>
          ))}
        </OncoCard>
      </View>
      </ScrollView>
    </ResponsiveScreen>
  );
}
