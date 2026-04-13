import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useFocusEffect } from "@react-navigation/native";
import { EmergencyModal } from "@/components/EmergencyModal";
import { SelfCareModal } from "@/components/SelfCareModal";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { SymptomQuickLog } from "@/src/diary/SymptomQuickLog";
import { presentTriageFeedback } from "@/src/triage/presentTriageFeedback";
import type { SymptomDetailKey } from "@/src/diary/symptomCatalog";
import type { SymptomLogRow } from "@/src/diary/symptomLogTypes";
import { VERBAL_SYMPTOM_LEVELS, prdLevelFromVerbalKey, type VerbalSymptomKey } from "@/src/diary/verbalSeverity";
import { labelPainRegion } from "@/src/diary/painRegions";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import { labelSeverity, labelSymptomCategory } from "@/src/i18n/ui";
import { loggedByProfileIdForInsert } from "@/src/lib/actorProfile";
import { supabase } from "@/src/lib/supabase";
import type { AppTheme } from "@/src/theme/theme";

const MOODS = [
  { key: "happy", label: "Bem" },
  { key: "neutral", label: "Neutro" },
  { key: "sad", label: "Mal" },
] as const;

function painRegionFromNotes(notes: string | null): string | null {
  if (!notes?.trim()) return null;
  try {
    const j = JSON.parse(notes) as { painRegion?: string };
    if (j.painRegion && typeof j.painRegion === "string") return labelPainRegion(j.painRegion);
  } catch {
    /* not JSON */
  }
  return null;
}

function CheckInVerbalBlock({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: VerbalSymptomKey;
  onChange: (v: VerbalSymptomKey) => void;
  theme: AppTheme;
}) {
  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: theme.spacing.sm }}>
        {VERBAL_SYMPTOM_LEVELS.map((row) => {
          const active = value === row.key;
          return (
            <Pressable
              key={row.key}
              onPress={() => {
                onChange(row.key);
                void Haptics.selectionAsync();
              }}
              style={{
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: active ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.text.primary }}>{row.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DiaryScreen() {
  const { theme } = useAppTheme();
  const { patient, refresh } = usePatient();
  const { cycles } = useTreatmentCycles(patient);
  const [logs, setLogs] = useState<SymptomLogRow[]>([]);
  const [symptomDetailFocus, setSymptomDetailFocus] = useState<SymptomDetailKey | null>(null);
  const hideDiaryChrome = symptomDetailFocus === "sleep_changes";
  const [fullModalOpen, setFullModalOpen] = useState(false);
  const [painV, setPainV] = useState<VerbalSymptomKey>("present");
  const [nauseaV, setNauseaV] = useState<VerbalSymptomKey>("present");
  const [fatigueV, setFatigueV] = useState<VerbalSymptomKey>("present");
  const [mood, setMood] = useState<(typeof MOODS)[number]["key"]>("neutral");
  const [note, setNote] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selfCareOpen, setSelfCareOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!patient) return;
    setLoadError(null);
    const { data, error } = await supabase
      .from("symptom_logs")
      .select(
        "id, entry_kind, symptom_category, severity, pain_level, nausea_level, fatigue_level, mood, body_temperature, notes, logged_at, symptom_started_at, symptom_ended_at, triage_semaphore, attachment_storage_path"
      )
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(200);
    if (error) {
      setLoadError("Não foi possível carregar sintomas. Tente novamente.");
      return;
    }
    if (data) setLogs(data as SymptomLogRow[]);
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs])
  );

  const onLogged = useCallback(async () => {
    await loadLogs();
    await refresh();
  }, [loadLogs, refresh]);

  async function submitPrd() {
    if (!patient) return;
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
        /* opcional */
      }
    }
    const actor = await loggedByProfileIdForInsert();
    const { data: inserted, error } = await supabase
      .from("symptom_logs")
      .insert({
        patient_id: patient.id,
        entry_kind: "prd",
        pain_level: prdLevelFromVerbalKey(painV),
        nausea_level: prdLevelFromVerbalKey(nauseaV),
        fatigue_level: prdLevelFromVerbalKey(fatigueV),
        mood,
        notes: note.trim() || null,
        voice_storage_path: voicePath,
        logged_at: new Date().toISOString(),
        logged_by_profile_id: actor ?? null,
      })
      .select("triage_semaphore")
      .single();
    setBusy(false);
    if (error) {
      Alert.alert("Sintomas", error.message);
      return;
    }
    presentTriageFeedback((inserted as { triage_semaphore?: string | null })?.triage_semaphore ?? null, {
      openSelfCare: () => setSelfCareOpen(true),
      openEmergency: (msg) => {
        setEmergencyMsg(msg);
        setEmergencyOpen(true);
      },
    });
    setNote("");
    setVoiceUri(null);
    setFullModalOpen(false);
    await onLogged();
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

  if (!patient) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <View style={{ flex: 1, paddingVertical: theme.spacing.md }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sintomas</Text>
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
        contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
          <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>Sintomas</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
            Os gráficos ficam no tela de cada sintoma. Abaixo, a lista completa — toque para histórico e registro.
          </Text>
          {patient.is_caregiver_session ? (
            <Text style={[theme.typography.body, { color: theme.colors.semantic.treatment, marginTop: theme.spacing.sm, fontWeight: "600" }]}>
              Modo cuidador: vê o prontuário do paciente. Cada registo fica com o seu utilizador como autor (auditoria no dossier da equipa).
            </Text>
          ) : null}
          {loadError ? (
            <Pressable onPress={() => void loadLogs()} style={{ marginTop: theme.spacing.sm }}>
              <Text style={[theme.typography.body, { color: "#DC2626" }]}>{loadError} Toque para tentar novamente.</Text>
            </Pressable>
          ) : null}
        </View>

        <SymptomQuickLog
          theme={theme}
          patientId={patient.id}
          logs={logs}
          onLogged={onLogged}
          onSymptomDetailFocusChange={setSymptomDetailFocus}
          primaryCancerType={patient.primary_cancer_type}
          activeTreatmentKind={cycles.find((c) => c.status === "active")?.treatment_kind ?? null}
        />

        {!hideDiaryChrome ? (
          <>
            <Pressable
              onPress={() => setFullModalOpen(true)}
              style={{
                marginBottom: theme.spacing.lg,
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: theme.spacing.md,
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border.divider,
              }}
            >
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Check-in completo</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                  Dor, náusea e fadiga juntos, humor, nota e voz.
                </Text>
              </View>
              <Text style={{ fontSize: 20, color: theme.colors.text.tertiary, fontWeight: "300" }}>›</Text>
            </Pressable>

            <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
              Últimos registros
            </Text>
            <View
              style={{
                borderRadius: theme.radius.lg,
                overflow: "hidden",
                backgroundColor: theme.colors.background.primary,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.colors.border.divider,
              }}
            >
              {logs.slice(0, 14).map((l, idx) => {
                const painReg = painRegionFromNotes(l.notes);
                return (
                  <View
                    key={l.id}
                    style={{
                      paddingVertical: theme.spacing.md,
                      paddingHorizontal: theme.spacing.md,
                      borderBottomWidth: idx < Math.min(logs.length, 14) - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: theme.colors.border.divider,
                    }}
                  >
                    {l.entry_kind === "prd" ? (
                      <>
                        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                          Dor {l.pain_level ?? "—"} · Náusea {l.nausea_level ?? "—"} · Fadiga {l.fatigue_level ?? "—"}
                          {l.mood && l.mood !== "neutral" ? ` · ${l.mood}` : ""}
                        </Text>
                        {painReg ? (
                          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                            Dor: {painReg}
                          </Text>
                        ) : null}
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
                        {l.symptom_started_at && l.symptom_ended_at ? (
                          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                            {new Date(l.symptom_started_at).toLocaleString("pt-BR")} →{" "}
                            {new Date(l.symptom_ended_at).toLocaleString("pt-BR")}
                          </Text>
                        ) : null}
                        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                          Registado {new Date(l.logged_at).toLocaleString("pt-BR")}
                          {l.body_temperature != null ? ` · ${l.body_temperature}°C` : ""}
                        </Text>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <SelfCareModal visible={selfCareOpen} onClose={() => setSelfCareOpen(false)} />
      <EmergencyModal visible={emergencyOpen} message={emergencyMsg} onClose={() => setEmergencyOpen(false)} />

      <Modal visible={fullModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFullModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, padding: theme.spacing.lg, paddingTop: theme.spacing.xl }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Check-in completo</Text>
            <Pressable onPress={() => setFullModalOpen(false)} hitSlop={12}>
              <Text style={[theme.typography.headline, { color: theme.colors.semantic.treatment }]}>Fechar</Text>
            </Pressable>
          </View>
          <ScrollView style={{ marginTop: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              Escolha a intensidade (não presente a grave) para cada sintoma. Útil quando quer registrar tudo de uma vez.
            </Text>
            <CheckInVerbalBlock label="Dor" value={painV} onChange={setPainV} theme={theme} />
            <CheckInVerbalBlock label="Náusea" value={nauseaV} onChange={setNauseaV} theme={theme} />
            <CheckInVerbalBlock label="Fadiga" value={fatigueV} onChange={setFatigueV} theme={theme} />
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
              placeholder="Nota (opcional)"
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
              {voiceUri ? <Text style={{ color: theme.colors.text.secondary, flex: 1 }}>Áudio pronto</Text> : null}
            </View>
            <Pressable
              onPress={() => void submitPrd()}
              disabled={busy}
              style={{
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.xl * 2,
                backgroundColor: theme.colors.semantic.symptoms,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                alignItems: "center",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Guardar check-in</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </ResponsiveScreen>
  );
}
