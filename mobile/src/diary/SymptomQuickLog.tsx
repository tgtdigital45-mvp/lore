import { useCallback, useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { EmergencyModal } from "@/components/EmergencyModal";
import { SelfCareModal } from "@/components/SelfCareModal";
import { uploadSymptomAttachment } from "@/src/lib/symptomAttachmentUpload";
import { presentTriageFeedback } from "@/src/triage/presentTriageFeedback";
import { PAIN_REGIONS, labelPainRegion, type PainRegionId } from "@/src/diary/painRegions";
import { LegacySymptomLogStep } from "@/src/diary/LegacySymptomLogStep";
import { VerbalIntensityStep } from "@/src/diary/VerbalIntensityStep";
import {
  logDestinationForSymptom,
  type SymptomDetailKey,
  type SymptomLogDestination,
  symptomLabel,
} from "@/src/diary/symptomCatalog";
import { orderedSymptomNavItems } from "@/src/diary/symptomModules/ordering";
import type { TreatmentKind } from "@/src/types/treatment";
import { SymptomDetailView } from "@/src/diary/SymptomDetailView";
import type { SymptomLogRow } from "@/src/diary/symptomLogTypes";
import { AeNauseaFlow } from "@/src/diary/AeNauseaFlow";
import { AeFeverFlow } from "@/src/diary/AeFeverFlow";
import { submitAeFlowLog, startFeverWatchEpisode } from "@/src/diary/aeFlowSubmit";
import type { PromFlowResult } from "@/src/diary/promFlows/types";
import {
  type VerbalSymptomDbSeverity,
  type VerbalSymptomKey,
  prdLevelFromVerbalKey,
} from "@/src/diary/verbalSeverity";
import { supabase } from "@/src/lib/supabase";
import { loggedByProfileIdForInsert } from "@/src/lib/actorProfile";
import type { AppTheme } from "@/src/theme/theme";

type Wizard =
  | { screen: "list" }
  | { screen: "symptom_detail"; key: SymptomDetailKey }
  | { screen: "pain_region" }
  | { screen: "pain_intensity"; region: PainRegionId }
  | { screen: "single_intensity"; key: "fatigue" | "nausea" }
  | { screen: "fever_temp" }
  | { screen: "legacy_verbal"; key: SymptomDetailKey }
  | { screen: "ae_nausea" }
  | { screen: "ae_fever" };

function destinationToWizard(d: SymptomLogDestination): Wizard {
  switch (d.type) {
    case "pain_region":
      return { screen: "pain_region" };
    case "single_intensity":
      return { screen: "single_intensity", key: d.key };
    case "fever_temp":
      return { screen: "fever_temp" };
    case "legacy_intensity":
      return { screen: "legacy_verbal", key: d.key };
  }
}

function diaryChromeDetailKey(w: Wizard): SymptomDetailKey | null {
  if (w.screen === "symptom_detail" || w.screen === "legacy_verbal") return w.key;
  return null;
}

type Props = {
  theme: AppTheme;
  patientId: string;
  logs: SymptomLogRow[];
  onLogged: () => Promise<void> | void;
  onSymptomDetailFocusChange?: (key: SymptomDetailKey | null) => void;
  primaryCancerType?: string | null;
  activeTreatmentKind?: TreatmentKind | null;
};

function prdNotesPainRegion(region: PainRegionId): string {
  return JSON.stringify({ kind: "prd_meta", painRegion: region });
}

export function SymptomQuickLog({
  theme,
  patientId,
  logs,
  onLogged,
  onSymptomDetailFocusChange,
  primaryCancerType,
  activeTreatmentKind,
}: Props) {
  const navItems = orderedSymptomNavItems(primaryCancerType, activeTreatmentKind ?? null);
  const [wizard, setWizard] = useState<Wizard>({ screen: "list" });
  const [painVerbal, setPainVerbal] = useState<VerbalSymptomKey>("present");
  const [singleVerbal, setSingleVerbal] = useState<VerbalSymptomKey>("present");
  const [temperature, setTemperature] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [selfCareOpen, setSelfCareOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState("");
  const returnToDetailKeyRef = useRef<SymptomDetailKey | null>(null);

  useEffect(() => {
    onSymptomDetailFocusChange?.(diaryChromeDetailKey(wizard));
  }, [wizard, onSymptomDetailFocusChange]);

  const resetToList = useCallback(() => {
    returnToDetailKeyRef.current = null;
    setWizard({ screen: "list" });
  }, []);

  const finishLogAndNavigate = useCallback(async () => {
    await onLogged();
    const k = returnToDetailKeyRef.current;
    returnToDetailKeyRef.current = null;
    if (k) {
      setWizard({ screen: "symptom_detail", key: k });
    } else {
      resetToList();
    }
  }, [onLogged, resetToList]);

  const runTriageUi = useCallback((triage: string | null) => {
    presentTriageFeedback(triage, {
      openSelfCare: () => setSelfCareOpen(true),
      openEmergency: (msg) => {
        setEmergencyMsg(msg);
        setEmergencyOpen(true);
      },
    });
  }, []);

  const submitPrd = useCallback(
    async (payload: {
      pain: number;
      nausea: number;
      fatigue: number;
      notes: string | null;
    }) => {
      setBusy(true);
      let attachmentPath: string | null = null;
      if (pendingPhotoUri) {
        attachmentPath = await uploadSymptomAttachment(patientId, pendingPhotoUri);
      }
      const actor = await loggedByProfileIdForInsert();
      const { data, error } = await supabase
        .from("symptom_logs")
        .insert({
          patient_id: patientId,
          entry_kind: "prd",
          pain_level: Math.round(payload.pain),
          nausea_level: Math.round(payload.nausea),
          fatigue_level: Math.round(payload.fatigue),
          mood: "neutral",
          notes: payload.notes,
          logged_at: new Date().toISOString(),
          attachment_storage_path: attachmentPath,
          logged_by_profile_id: actor ?? null,
        })
        .select("triage_semaphore")
        .single();
      setBusy(false);
      if (error) {
        Alert.alert("Sintomas", error.message);
        return;
      }
      setPendingPhotoUri(null);
      runTriageUi((data as { triage_semaphore?: string | null } | null)?.triage_semaphore ?? null);
      await finishLogAndNavigate();
    },
    [finishLogAndNavigate, patientId, pendingPhotoUri, runTriageUi]
  );

  const submitAeProm = useCallback(
    async (result: PromFlowResult, opts?: { startFeverWatch?: boolean }) => {
      setBusy(true);
      let attachmentPath: string | null = null;
      if (pendingPhotoUri) {
        attachmentPath = await uploadSymptomAttachment(patientId, pendingPhotoUri);
      }
      const res = await submitAeFlowLog({
        patientId,
        result,
        attachmentStoragePath: attachmentPath,
      });
      setBusy(false);
      if ("error" in res) {
        Alert.alert("Sintomas", res.error);
        return;
      }
      if (opts?.startFeverWatch) {
        const w = await startFeverWatchEpisode({ patientId, sourceSymptomLogId: res.logId });
        if (w.error) {
          Alert.alert("Vigilância de febre", w.error);
        }
      }
      setPendingPhotoUri(null);
      runTriageUi(res.triage_semaphore ?? null);
      await finishLogAndNavigate();
    },
    [finishLogAndNavigate, patientId, pendingPhotoUri, runTriageUi]
  );

  const submitLegacy = useCallback(
    async (
      symptom_category: string,
      args: {
        severity: VerbalSymptomDbSeverity;
        body_temperature: number | null;
        symptom_started_at: string | null;
        symptom_ended_at: string | null;
        logged_at: string;
      }
    ) => {
      setBusy(true);
      let attachmentPath: string | null = null;
      if (pendingPhotoUri) {
        attachmentPath = await uploadSymptomAttachment(patientId, pendingPhotoUri);
      }
      const actor = await loggedByProfileIdForInsert();
      const { data, error } = await supabase
        .from("symptom_logs")
        .insert({
          patient_id: patientId,
          entry_kind: "legacy",
          symptom_category,
          severity: args.severity,
          body_temperature: args.body_temperature,
          logged_at: args.logged_at,
          symptom_started_at: args.symptom_started_at,
          symptom_ended_at: args.symptom_ended_at,
          attachment_storage_path: attachmentPath,
          logged_by_profile_id: actor ?? null,
        })
        .select("triage_semaphore")
        .single();
      setBusy(false);
      if (error) {
        Alert.alert("Sintomas", error.message);
        return;
      }
      setPendingPhotoUri(null);
      setTemperature("");
      runTriageUi((data as { triage_semaphore?: string | null } | null)?.triage_semaphore ?? null);
      await finishLogAndNavigate();
    },
    [finishLogAndNavigate, patientId, pendingPhotoUri, runTriageUi]
  );

  const pickSymptomPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Fotos", "Permita o acesso à galeria para anexar uma imagem.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) setPendingPhotoUri(res.assets[0].uri);
  }, []);

  if (wizard.screen === "symptom_detail") {
    const dest = logDestinationForSymptom(wizard.key);
    return (
      <SymptomDetailView
        theme={theme}
        symptomKey={wizard.key}
        logs={logs}
        onBack={resetToList}
        onAdd={() => {
          returnToDetailKeyRef.current = wizard.key;
          setWizard(destinationToWizard(dest));
        }}
      />
    );
  }

  if (wizard.screen === "pain_region") {
    return (
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Pressable
          onPress={resetToList}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
        >
          <Text style={{ fontSize: 22, color: theme.colors.semantic.symptoms, fontWeight: "600" }}>‹</Text>
          <Text style={[theme.typography.body, { color: theme.colors.semantic.symptoms, marginLeft: 4 }]}>Voltar</Text>
        </Pressable>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Dor</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
          Onde sente mais?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          {PAIN_REGIONS.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setWizard({ screen: "pain_intensity", region: r.id })}
              style={{
                width: "48%",
                flexGrow: 1,
                minWidth: "45%",
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.radius.lg,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.sm,
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
              }}
            >
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (wizard.screen === "pain_intensity") {
    return (
      <VerbalIntensityStep
        theme={theme}
        title="Intensidade da dor"
        subtitle={labelPainRegion(wizard.region)}
        value={painVerbal}
        onChange={setPainVerbal}
        accent={theme.colors.semantic.symptoms}
        onBack={() => setWizard({ screen: "pain_region" })}
        busy={busy}
        onSubmit={() =>
          void submitPrd({
            pain: prdLevelFromVerbalKey(painVerbal),
            nausea: 0,
            fatigue: 0,
            notes: prdNotesPainRegion(wizard.region),
          })
        }
      />
    );
  }

  if (wizard.screen === "single_intensity") {
    const isFatigue = wizard.key === "fatigue";
    const title = isFatigue ? "Fadiga" : "Náusea";
    const sub = isFatigue ? "Quanto a fadiga o limita agora?" : "Quanto sente náusea agora?";
    return (
      <VerbalIntensityStep
        theme={theme}
        title={title}
        subtitle={sub}
        value={singleVerbal}
        onChange={setSingleVerbal}
        accent={theme.colors.semantic.symptoms}
        onBack={resetToList}
        busy={busy}
        onSubmit={() =>
          void submitPrd(
            isFatigue
              ? { pain: 0, nausea: 0, fatigue: prdLevelFromVerbalKey(singleVerbal), notes: null }
              : { pain: 0, nausea: prdLevelFromVerbalKey(singleVerbal), fatigue: 0, notes: null }
          )
        }
      />
    );
  }

  if (wizard.screen === "fever_temp") {
    return (
      <View>
        <Pressable
          onPress={resetToList}
          hitSlop={12}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
        >
          <Text style={{ fontSize: 22, color: theme.colors.semantic.vitals, fontWeight: "600" }}>‹</Text>
          <Text style={[theme.typography.body, { color: theme.colors.semantic.vitals, marginLeft: 4 }]}>Voltar</Text>
        </Pressable>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Febre</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
          Temperatura oral ou axilar (°C)
        </Text>
        <TextInput
          placeholder="ex.: 37,6"
          keyboardType="decimal-pad"
          placeholderTextColor={theme.colors.text.tertiary}
          value={temperature}
          onChangeText={setTemperature}
          style={{
            marginTop: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            fontSize: 28,
            fontWeight: "600",
            backgroundColor: theme.colors.background.primary,
            borderWidth: 1,
            borderColor: theme.colors.border.divider,
            color: theme.colors.text.primary,
          }}
        />
        <Pressable
          onPress={() => {
            const t = parseFloat(temperature.replace(",", "."));
            if (!Number.isFinite(t) || t < 35 || t > 42) {
              Alert.alert("Febre", "Indique uma temperatura entre 35 e 42 °C.");
              return;
            }
            const logged = new Date().toISOString();
            void submitLegacy("fever", {
              severity: "mild",
              body_temperature: t,
              symptom_started_at: null,
              symptom_ended_at: null,
              logged_at: logged,
            });
          }}
          disabled={busy}
          style={{
            marginTop: theme.spacing.xl,
            backgroundColor: theme.colors.semantic.vitals,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radius.lg,
            alignItems: "center",
            opacity: busy ? 0.55 : 1,
          }}
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Registrar</Text>
        </Pressable>
      </View>
    );
  }

  if (wizard.screen === "ae_nausea") {
    return (
      <AeNauseaFlow
        theme={theme}
        busy={busy}
        onBack={resetToList}
        onSubmit={(r) => void submitAeProm(r)}
      />
    );
  }

  if (wizard.screen === "ae_fever") {
    return (
      <AeFeverFlow
        theme={theme}
        busy={busy}
        onBack={resetToList}
        onSubmit={(r) => {
          const { startFeverWatch, ...rest } = r;
          void submitAeProm(rest, { startFeverWatch });
        }}
      />
    );
  }

  if (wizard.screen === "legacy_verbal") {
    return (
      <LegacySymptomLogStep
        theme={theme}
        symptomKey={wizard.key}
        accent={theme.colors.semantic.symptoms}
        onBack={() => setWizard({ screen: "symptom_detail", key: wizard.key })}
        busy={busy}
        onSubmit={(payload) =>
          void submitLegacy(wizard.key, {
            severity: payload.severity,
            body_temperature: null,
            symptom_started_at: payload.symptom_started_at,
            symptom_ended_at: payload.symptom_ended_at,
            logged_at: payload.logged_at,
          })
        }
      />
    );
  }

  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Pressable
        onPress={() => void pickSymptomPhoto()}
        style={{
          marginBottom: theme.spacing.sm,
          paddingVertical: 12,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.background.primary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border.divider,
        }}
      >
        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
          {pendingPhotoUri ? "Foto anexada ao próximo registo (tocar para alterar)" : "Anexar foto ao próximo sintoma (opcional)"}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
          Útil para reações cutâneas ou lesões — fica no dossier da equipa.
        </Text>
      </Pressable>
      <View
        style={{
          marginBottom: theme.spacing.md,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          backgroundColor: theme.colors.background.primary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.semantic.symptoms,
        }}
      >
        <Text style={[theme.typography.body, { paddingHorizontal: theme.spacing.md, paddingTop: 10, color: theme.colors.text.secondary }]}>
          ePROM (CTCAE)
        </Text>
        <Pressable
          onPress={() => setWizard({ screen: "ae_nausea" })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.border.divider,
          }}
        >
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: theme.colors.text.primary }}>
            Náusea — questionário adaptativo
          </Text>
          <Text style={{ fontSize: 20, color: theme.colors.text.tertiary, fontWeight: "300" }}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => setWizard({ screen: "ae_fever" })}
          style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: theme.spacing.md }}
        >
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: theme.colors.text.primary }}>
            Febre — questionário adaptativo
          </Text>
          <Text style={{ fontSize: 20, color: theme.colors.text.tertiary, fontWeight: "300" }}>›</Text>
        </Pressable>
      </View>
      <View
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          backgroundColor: theme.colors.background.primary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border.divider,
        }}
      >
        {navItems.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() => setWizard({ screen: "symptom_detail", key: item.id })}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 14,
              paddingHorizontal: theme.spacing.md,
              borderBottomWidth: index < navItems.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: theme.colors.border.divider,
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: theme.colors.text.primary }}>{item.label}</Text>
            <Text style={{ fontSize: 20, color: theme.colors.text.tertiary, fontWeight: "300" }}>›</Text>
          </Pressable>
        ))}
      </View>
      <SelfCareModal visible={selfCareOpen} onClose={() => setSelfCareOpen(false)} />
      <EmergencyModal visible={emergencyOpen} message={emergencyMsg} onClose={() => setEmergencyOpen(false)} />
    </View>
  );
}
