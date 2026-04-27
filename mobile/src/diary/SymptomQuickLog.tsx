import { useCallback, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Alert, BackHandler, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { showAppToast } from "@/src/lib/appToast";
import { EmergencyModal } from "@/components/EmergencyModal";
import { SelfCareModal } from "@/components/SelfCareModal";
import { uploadSymptomAttachment } from "@/src/lib/symptomAttachmentUpload";
import { presentTriageFeedback } from "@/src/triage/presentTriageFeedback";
import { LegacySymptomLogStep } from "@/src/diary/LegacySymptomLogStep";
import {
  logDestinationForSymptom,
  type SymptomDetailKey,
  type SymptomLogDestination,
} from "@/src/diary/symptomCatalog";
import { orderedSymptomNavItems } from "@/src/diary/symptomModules/ordering";
import type { TreatmentKind } from "@/src/types/treatment";
import { SymptomDetailView } from "@/src/diary/SymptomDetailView";
import type { SymptomLogRow } from "@/src/diary/symptomLogTypes";
import type { VerbalSymptomDbSeverity } from "@/src/diary/verbalSeverity";
import { enqueueSymptomLog } from "@/src/lib/offlineMutationQueue";
import { supabase } from "@/src/lib/supabase";
import { loggedByProfileIdForInsert } from "@/src/lib/actorProfile";
import type { AppTheme } from "@/src/theme/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";

type Wizard =
  | { screen: "list" }
  | { screen: "symptom_detail"; key: SymptomDetailKey }
  | { screen: "fever_temp" }
  | { screen: "legacy_verbal"; key: SymptomDetailKey };

function destinationToWizard(d: SymptomLogDestination): Wizard {
  switch (d.type) {
    case "fever_temp":
      return { screen: "fever_temp" };
    case "legacy_intensity":
      return { screen: "legacy_verbal", key: d.key };
  }
}

function diaryChromeDetailKey(w: Wizard): SymptomDetailKey | null {
  if (w.screen === "symptom_detail" || w.screen === "legacy_verbal") return w.key;
  if (w.screen === "fever_temp") return "fever";
  return null;
}

const SYMPTOM_LOG_INSERT_SELECT =
  "id, entry_kind, symptom_category, severity, pain_level, nausea_level, fatigue_level, mood, body_temperature, notes, logged_at, symptom_started_at, symptom_ended_at, triage_semaphore, attachment_storage_path";

type Props = {
  theme: AppTheme;
  patientId: string;
  logs: SymptomLogRow[];
  onLogged: (opts?: { insertedRow?: SymptomLogRow }) => Promise<void> | void;
  onDeleteSymptom?: (id: string) => Promise<void>;
  onSymptomDetailFocusChange?: (key: SymptomDetailKey | null) => void;
  primaryCancerType?: string | null;
  activeTreatmentKind?: TreatmentKind | null;
};

export function SymptomQuickLog({
  theme,
  patientId,
  logs,
  onLogged,
  onDeleteSymptom,
  onSymptomDetailFocusChange,
  primaryCancerType,
  activeTreatmentKind,
}: Props) {
  const navItems = orderedSymptomNavItems(primaryCancerType, activeTreatmentKind ?? null);
  const [wizard, setWizard] = useState<Wizard>({ screen: "list" });
  const [temperature, setTemperature] = useState("");
  const [busy, setBusy] = useState(false);
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

  useEffect(() => {
    const onBackPress = () => {
      if (wizard.screen !== "list") {
        if (wizard.screen === "symptom_detail") {
          resetToList();
        } else if (wizard.screen === "legacy_verbal" || wizard.screen === "fever_temp") {
          const k = diaryChromeDetailKey(wizard);
          if (k) setWizard({ screen: "symptom_detail", key: k });
          else resetToList();
        }
        return true; // prevent default behavior
      }
      return false; // allow default back
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [wizard, resetToList]);

  const finishLogAndNavigate = useCallback(
    async (insertedRow?: SymptomLogRow | null) => {
      try {
        await onLogged(insertedRow ? { insertedRow } : undefined);
      } catch (e) {
        showAppToast("error", "Sintomas", e instanceof Error ? e.message : "Erro ao atualizar os registos.");
        return;
      }
      const k = returnToDetailKeyRef.current;
      returnToDetailKeyRef.current = null;
      if (k) {
        setWizard({ screen: "symptom_detail", key: k });
      } else {
        resetToList();
      }
    },
    [onLogged, resetToList]
  );

  const runTriageUi = useCallback((triage: string | null) => {
    presentTriageFeedback(triage, {
      openSelfCare: () => setSelfCareOpen(true),
      openEmergency: (msg) => {
        setEmergencyMsg(msg);
        setEmergencyOpen(true);
      },
    });
  }, []);

  const submitLegacy = useCallback(
    async (
      symptom_category: string,
      args: {
        severity: VerbalSymptomDbSeverity;
        body_temperature: number | null;
        symptom_started_at: string | null;
        symptom_ended_at: string | null;
        logged_at: string;
        notes?: string | null;
        attachmentUri?: string | null;
      }
    ) => {
      setBusy(true);
      try {
        let attachmentPath: string | null = null;
        if (args.attachmentUri) {
          attachmentPath = await uploadSymptomAttachment(patientId, args.attachmentUri);
        }
        const actor = await loggedByProfileIdForInsert();
        const row = {
          patient_id: patientId,
          entry_kind: "legacy",
          symptom_category,
          severity: args.severity,
          body_temperature: args.body_temperature,
          logged_at: args.logged_at,
          symptom_started_at: args.symptom_started_at,
          symptom_ended_at: args.symptom_ended_at,
          notes: args.notes ?? null,
          attachment_storage_path: attachmentPath,
          logged_by_profile_id: actor ?? null,
        };

        if (!args.attachmentUri) {
          const net = await NetInfo.fetch();
          if (!net.isConnected) {
            await enqueueSymptomLog(patientId, row);
            showAppToast("success", "Sintomas", "Guardado localmente; sincroniza quando estiver online.");
            setTemperature("");
            await finishLogAndNavigate(null);
            return;
          }
        }

        const { data: symptomData, error: symptomError } = await supabase
          .from("symptom_logs")
          .insert(row)
          .select(SYMPTOM_LOG_INSERT_SELECT)
          .single();

        if (symptomError) {
          showAppToast("error", "Sintomas", symptomError.message);
          Alert.alert("Erro ao registrar", symptomError.message);
          return;
        }

        const inserted = symptomData as SymptomLogRow | null;

        // Se for febre com temperatura, registar também em vital_logs para unificação
        if (symptom_category === "fever" && args.body_temperature != null && inserted?.id) {
          const { error: vitalError } = await supabase.from("vital_logs").insert({
            patient_id: patientId,
            vital_type: "temperature",
            value_numeric: args.body_temperature,
            unit: "°C",
            logged_at: args.logged_at,
            metadata: { symptom_log_id: inserted.id },
          });
          if (vitalError) {
            console.warn("[SymptomQuickLog] Failed to sync fever to vital_logs:", vitalError.message);
          }
        }

        setTemperature("");
        showAppToast("success", "Sintomas", "Registo guardado.");
        runTriageUi(inserted?.triage_semaphore ?? null);
        await finishLogAndNavigate(inserted);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao guardar. Verifique a ligação e tente novamente.";
        showAppToast("error", "Sintomas", msg);
        Alert.alert("Erro", msg);
      } finally {
        setBusy(false);
      }
    },
    [finishLogAndNavigate, patientId, runTriageUi]
  );

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
        onDelete={onDeleteSymptom}
      />
    );
  }

  if (wizard.screen === "fever_temp") {
    return (
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}>
          <CircleChromeButton
            onPress={() => setWizard({ screen: "symptom_detail", key: "fever" })}
            accessibilityLabel="Voltar"
          >
            <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
          </CircleChromeButton>
        </View>
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
              showAppToast("info", "Febre", "Indique uma temperatura entre 35 e 42 °C.");
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
            notes: payload.notes,
            attachmentUri: payload.photoUri,
          })
        }
      />
    );
  }

  return (
    <View style={{ marginBottom: theme.spacing.md }}>
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
