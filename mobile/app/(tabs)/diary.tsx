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


export default function DiaryScreen() {
  const { theme } = useAppTheme();
  const { patient, refresh } = usePatient();
  const { cycles } = useTreatmentCycles(patient);
  const [logs, setLogs] = useState<SymptomLogRow[]>([]);
  const [symptomDetailFocus, setSymptomDetailFocus] = useState<SymptomDetailKey | null>(null);
  const hideDiaryChrome = symptomDetailFocus === "sleep_changes";
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
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

    </ResponsiveScreen>
  );
}
