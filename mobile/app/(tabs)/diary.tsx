import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
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
const MOODS = [
  { key: "happy", label: "Bem" },
  { key: "neutral", label: "Neutro" },
  { key: "sad", label: "Mal" },
] as const;

type LogRow = {
  id: string;
  entry_kind: string;
  symptom_category: string | null;
  severity: string | null;
  pain_level: number | null;
  nausea_level: number | null;
  fatigue_level: number | null;
  mood: string | null;
  body_temperature: number | null;
  logged_at: string;
};

export default function DiaryScreen() {
  const { theme } = useAppTheme();
  const { patient, refresh } = usePatient();
  const [pain, setPain] = useState(3);
  const [nausea, setNausea] = useState(2);
  const [fatigue, setFatigue] = useState(3);
  const [mood, setMood] = useState<(typeof MOODS)[number]["key"]>("neutral");
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("fatigue");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("mild");
  const [temperature, setTemperature] = useState("");

  const [logs, setLogs] = useState<LogRow[]>([]);

  const loadLogs = useCallback(async () => {
    if (!patient) return;
    const { data, error } = await supabase
      .from("symptom_logs")
      .select(
        "id, entry_kind, symptom_category, severity, pain_level, nausea_level, fatigue_level, mood, body_temperature, logged_at"
      )
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(200);
    if (!error && data) setLogs(data as LogRow[]);
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs])
  );

  async function submitPrd() {
    if (!patient) {
      Alert.alert("Diário", "Complete o cadastro do paciente antes.");
      return;
    }
    setBusy(true);
    let voicePath: string | null = null;
    if (voiceUri) {
      try {
        const path = `${patient.id}/${Date.now()}.m4a`;
        const res = await fetch(voiceUri);
        const buf = await res.arrayBuffer();
        const { error: upErr } = await supabase.storage.from("patient_voice").upload(path, buf, {
          contentType: "audio/m4a",
          upsert: false,
        });
        if (!upErr) voicePath = path;
      } catch {
        /* upload opcional */
      }
    }
    const { error } = await supabase.from("symptom_logs").insert({
      patient_id: patient.id,
      entry_kind: "prd",
      pain_level: Math.round(pain),
      nausea_level: Math.round(nausea),
      fatigue_level: Math.round(fatigue),
      mood,
      notes: note.trim() || null,
      voice_storage_path: voicePath,
      logged_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      Alert.alert("Diário", error.message);
      return;
    }
    setNote("");
    setVoiceUri(null);
    await loadLogs();
    await refresh();
  }

  async function startVoice() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microfone", "Permita o acesso ao microfone para gravar uma nota.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e) {
      Alert.alert("Gravação", e instanceof Error ? e.message : "Não foi possível gravar.");
    }
  }

  async function stopVoice() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setVoiceUri(uri ?? null);
    } finally {
      setRecording(null);
    }
  }

  async function submitLegacy() {
    if (!patient) {
      Alert.alert("Diário", "Complete o cadastro do paciente antes.");
      return;
    }
    setBusy(true);
    const temp =
      category === "fever" && temperature.trim() !== "" ? parseFloat(temperature.replace(",", ".")) : null;
    const { error } = await supabase.from("symptom_logs").insert({
      patient_id: patient.id,
      entry_kind: "legacy",
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

  const legacyLogs = useMemo(() => logs.filter((l) => l.entry_kind === "legacy" && l.severity), [logs]);

  const prdLogs = useMemo(() => logs.filter((l) => l.entry_kind === "prd"), [logs]);

  const lineData = useMemo(() => {
    const fevers = legacyLogs.filter((l) => l.symptom_category === "fever" && l.body_temperature != null);
    const last7 = fevers.slice(0, 7).reverse();
    return last7.map((l, i) => ({
      value: Number(l.body_temperature),
      label: String(i + 1),
      dataPointText: `${l.body_temperature}°`,
    }));
  }, [legacyLogs]);

  const prdPainLine = useMemo(() => {
    const last = prdLogs.slice(0, 14).reverse();
    return last.map((l, i) => ({
      value: l.pain_level ?? 0,
      label: String(i + 1),
      dataPointText: String(l.pain_level),
    }));
  }, [prdLogs]);

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
            Escalas 0–10 (rápido) e registo legado por categoria.
          </Text>
        </View>

        <OncoCard>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Como está hoje (0–10)</Text>
          {(
            [
              ["Dor", pain, setPain],
              ["Náusea", nausea, setNausea],
              ["Fadiga", fatigue, setFatigue],
            ] as const
          ).map(([label, val, setVal]) => (
            <View key={label} style={{ marginTop: theme.spacing.md }}>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                {label}: {Math.round(val)}
              </Text>
              <Slider
                style={{ width: "100%", height: 44 }}
                minimumValue={0}
                maximumValue={10}
                step={1}
                value={val}
                onValueChange={setVal}
                onSlidingComplete={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                minimumTrackTintColor={theme.colors.semantic.symptoms}
                maximumTrackTintColor={theme.colors.background.tertiary}
                thumbTintColor={theme.colors.semantic.treatment}
              />
            </View>
          ))}

          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
            Humor
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {MOODS.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setMood(m.key)}
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: mood === m.key ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                }}
              >
                <Text style={{ color: theme.colors.text.primary }}>{m.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            placeholder="Nota de texto (opcional)"
            placeholderTextColor={theme.colors.text.tertiary}
            value={note}
            onChangeText={setNote}
            multiline
            style={{
              marginTop: theme.spacing.md,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              minHeight: 72,
              backgroundColor: theme.colors.background.tertiary,
              color: theme.colors.text.primary,
            }}
          />

          <View style={{ marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            {!recording ? (
              <Pressable
                onPress={startVoice}
                style={{
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.background.secondary,
                }}
              >
                <Text style={{ color: theme.colors.text.primary }}>Gravar nota de voz</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={stopVoice}
                style={{
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.semantic.vitals,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Parar</Text>
              </Pressable>
            )}
            {voiceUri ? <Text style={{ color: theme.colors.text.secondary, flex: 1 }}>Áudio pronto para enviar</Text> : null}
          </View>

          <Pressable
            onPress={submitPrd}
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
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Salvar registo (PRD)</Text>
          </Pressable>
        </OncoCard>

        <OncoCard style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Registo clínico (legado)</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
            Categorias e intensidade (ex.: febre com temperatura).
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
            onPress={submitLegacy}
            disabled={busy}
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.semantic.respiratory,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: "center",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Salvar (legado)</Text>
          </Pressable>
        </OncoCard>

        {legacyLogs.length > 0 && (
          <OncoCard style={{ marginTop: theme.spacing.lg }}>
            <ToxicityHeatmap
              logs={legacyLogs.map((l) => ({ severity: l.severity as string, logged_at: l.logged_at }))}
            />
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

        {prdPainLine.length > 1 && (
          <OncoCard style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Tendência dor (PRD)</Text>
            <LineChart
              data={prdPainLine}
              color={theme.colors.semantic.symptoms}
              thickness={3}
              spacing={28}
              hideDataPoints={false}
              yAxisColor={theme.colors.border.divider}
              xAxisColor={theme.colors.border.divider}
              yAxisTextStyle={{ color: theme.colors.text.secondary }}
              xAxisLabelTextStyle={{ color: theme.colors.text.secondary }}
              curved
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
          {logs.slice(0, 12).map((l) => (
            <View
              key={l.id}
              style={{
                marginTop: theme.spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border.divider,
                paddingTop: theme.spacing.md,
              }}
            >
              {l.entry_kind === "prd" ? (
                <>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                    Dor {l.pain_level} · Náusea {l.nausea_level} · Fadiga {l.fatigue_level}
                    {l.mood ? ` · ${l.mood}` : ""}
                  </Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                    {new Date(l.logged_at).toLocaleString("pt-BR")}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                    {l.symptom_category ? labelSymptomCategory(l.symptom_category) : "—"} ·{" "}
                    {l.severity ? labelSeverity(l.severity) : "—"}
                  </Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                    {new Date(l.logged_at).toLocaleString("pt-BR")}
                    {l.body_temperature != null ? ` · ${l.body_temperature}°C` : ""}
                  </Text>
                </>
              )}
            </View>
          ))}
        </OncoCard>
      </ScrollView>
    </ResponsiveScreen>
  );
}
