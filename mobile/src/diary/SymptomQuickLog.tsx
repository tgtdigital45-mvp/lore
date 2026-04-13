import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PAIN_REGIONS, labelPainRegion, type PainRegionId } from "@/src/diary/painRegions";
import { LegacySymptomLogStep } from "@/src/diary/LegacySymptomLogStep";
import { VerbalIntensityStep } from "@/src/diary/VerbalIntensityStep";
import {
  SYMPTOM_NAV_ITEMS,
  logDestinationForSymptom,
  type SymptomDetailKey,
  type SymptomLogDestination,
  symptomLabel,
} from "@/src/diary/symptomCatalog";
import { SymptomDetailView } from "@/src/diary/SymptomDetailView";
import type { SymptomLogRow } from "@/src/diary/symptomLogTypes";
import {
  type VerbalSymptomDbSeverity,
  type VerbalSymptomKey,
  prdLevelFromVerbalKey,
} from "@/src/diary/verbalSeverity";
import { supabase } from "@/src/lib/supabase";
import type { AppTheme } from "@/src/theme/theme";

type Wizard =
  | { screen: "list" }
  | { screen: "symptom_detail"; key: SymptomDetailKey }
  | { screen: "pain_region" }
  | { screen: "pain_intensity"; region: PainRegionId }
  | { screen: "single_intensity"; key: "fatigue" | "nausea" }
  | { screen: "fever_temp" }
  | { screen: "legacy_verbal"; key: SymptomDetailKey };

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
};

function prdNotesPainRegion(region: PainRegionId): string {
  return JSON.stringify({ kind: "prd_meta", painRegion: region });
}

export function SymptomQuickLog({ theme, patientId, logs, onLogged, onSymptomDetailFocusChange }: Props) {
  const [wizard, setWizard] = useState<Wizard>({ screen: "list" });
  const [painVerbal, setPainVerbal] = useState<VerbalSymptomKey>("present");
  const [singleVerbal, setSingleVerbal] = useState<VerbalSymptomKey>("present");
  const [temperature, setTemperature] = useState("");
  const [busy, setBusy] = useState(false);
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

  const submitPrd = useCallback(
    async (payload: {
      pain: number;
      nausea: number;
      fatigue: number;
      notes: string | null;
    }) => {
      setBusy(true);
      const { error } = await supabase.from("symptom_logs").insert({
        patient_id: patientId,
        entry_kind: "prd",
        pain_level: Math.round(payload.pain),
        nausea_level: Math.round(payload.nausea),
        fatigue_level: Math.round(payload.fatigue),
        mood: "neutral",
        notes: payload.notes,
        logged_at: new Date().toISOString(),
      });
      setBusy(false);
      if (error) {
        Alert.alert("Sintomas", error.message);
        return;
      }
      await finishLogAndNavigate();
    },
    [finishLogAndNavigate, patientId]
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
      const { error } = await supabase.from("symptom_logs").insert({
        patient_id: patientId,
        entry_kind: "legacy",
        symptom_category,
        severity: args.severity,
        body_temperature: args.body_temperature,
        logged_at: args.logged_at,
        symptom_started_at: args.symptom_started_at,
        symptom_ended_at: args.symptom_ended_at,
      });
      setBusy(false);
      if (error) {
        Alert.alert("Sintomas", error.message);
        return;
      }
      setTemperature("");
      await finishLogAndNavigate();
    },
    [finishLogAndNavigate, patientId]
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
      <View
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          backgroundColor: theme.colors.background.primary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border.divider,
        }}
      >
        {SYMPTOM_NAV_ITEMS.map((item, index) => (
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
              borderBottomWidth: index < SYMPTOM_NAV_ITEMS.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: theme.colors.border.divider,
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: theme.colors.text.primary }}>{item.label}</Text>
            <Text style={{ fontSize: 20, color: theme.colors.text.tertiary, fontWeight: "300" }}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
