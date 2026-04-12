import { useCallback, useState, type ComponentProps } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { PAIN_REGIONS, labelPainRegion, type PainRegionId } from "@/src/diary/painRegions";
import { IntensityStep } from "@/src/diary/IntensityStep";
import { scale0to10ToSeverity } from "@/src/diary/scaleToSeverity";
import { labelSymptomCategory } from "@/src/i18n/ui";
import { supabase } from "@/src/lib/supabase";
import type { AppTheme } from "@/src/theme/theme";

type Wizard =
  | { screen: "grid" }
  | { screen: "pain_region" }
  | { screen: "pain_intensity"; region: PainRegionId }
  | { screen: "single_intensity"; key: "fatigue" | "nausea" }
  | { screen: "fever_temp" }
  | { screen: "other_intensity"; key: "diarrhea" | "hydration" };

const GRID_ITEMS: {
  id: string;
  label: string;
  icon: ComponentProps<typeof FontAwesome>["name"];
  accent: "symptoms" | "vitals" | "respiratory";
  go: Wizard;
}[] = [
  { id: "pain", label: "Dor", icon: "bolt", accent: "symptoms", go: { screen: "pain_region" } },
  { id: "fatigue", label: "Fadiga", icon: "heartbeat", accent: "symptoms", go: { screen: "single_intensity", key: "fatigue" } },
  { id: "nausea", label: "Náusea", icon: "medkit", accent: "respiratory", go: { screen: "single_intensity", key: "nausea" } },
  { id: "fever", label: "Febre", icon: "fire", accent: "vitals", go: { screen: "fever_temp" } },
  { id: "diarrhea", label: "Diarreia", icon: "tint", accent: "respiratory", go: { screen: "other_intensity", key: "diarrhea" } },
  { id: "hydration", label: "Hidratação", icon: "leaf", accent: "respiratory", go: { screen: "other_intensity", key: "hydration" } },
];

type Props = {
  theme: AppTheme;
  patientId: string;
  onLogged: () => Promise<void> | void;
};

function prdNotesPainRegion(region: PainRegionId): string {
  return JSON.stringify({ kind: "prd_meta", painRegion: region });
}

export function SymptomQuickLog({ theme, patientId, onLogged }: Props) {
  const [wizard, setWizard] = useState<Wizard>({ screen: "grid" });
  const [painLevel, setPainLevel] = useState(4);
  const [singleLevel, setSingleLevel] = useState(4);
  const [otherLevel, setOtherLevel] = useState(3);
  const [temperature, setTemperature] = useState("");
  const [busy, setBusy] = useState(false);

  const accent = (k: (typeof GRID_ITEMS)[number]["accent"]) => theme.colors.semantic[k];

  const resetToGrid = useCallback(() => {
    setWizard({ screen: "grid" });
  }, []);

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
      resetToGrid();
      await onLogged();
    },
    [onLogged, patientId, resetToGrid]
  );

  const submitLegacy = useCallback(
    async (symptom_category: string, severityScale: number, body_temperature: number | null) => {
      setBusy(true);
      const { error } = await supabase.from("symptom_logs").insert({
        patient_id: patientId,
        entry_kind: "legacy",
        symptom_category,
        severity: scale0to10ToSeverity(severityScale),
        body_temperature,
        logged_at: new Date().toISOString(),
      });
      setBusy(false);
      if (error) {
        Alert.alert("Sintomas", error.message);
        return;
      }
      setTemperature("");
      resetToGrid();
      await onLogged();
    },
    [onLogged, patientId, resetToGrid]
  );

  if (wizard.screen === "pain_region") {
    return (
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Pressable
          onPress={resetToGrid}
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
      <IntensityStep
        theme={theme}
        title="Intensidade da dor"
        subtitle={labelPainRegion(wizard.region)}
        value={painLevel}
        onChange={setPainLevel}
        accent={theme.colors.semantic.symptoms}
        onBack={() => setWizard({ screen: "pain_region" })}
        busy={busy}
        onSubmit={() =>
          void submitPrd({
            pain: painLevel,
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
      <IntensityStep
        theme={theme}
        title={title}
        subtitle={sub}
        value={singleLevel}
        onChange={setSingleLevel}
        accent={theme.colors.semantic.symptoms}
        onBack={resetToGrid}
        busy={busy}
        onSubmit={() =>
          void submitPrd(
            isFatigue
              ? { pain: 0, nausea: 0, fatigue: singleLevel, notes: null }
              : { pain: 0, nausea: singleLevel, fatigue: 0, notes: null }
          )
        }
      />
    );
  }

  if (wizard.screen === "fever_temp") {
    return (
      <View>
        <Pressable
          onPress={resetToGrid}
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
            void submitLegacy("fever", 0, t);
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
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Registar</Text>
        </Pressable>
      </View>
    );
  }

  if (wizard.screen === "other_intensity") {
    const cat = wizard.key;
    const label = labelSymptomCategory(cat);
    return (
      <IntensityStep
        theme={theme}
        title={label}
        subtitle="Intensidade agora (0 = nada, 10 = muito intenso)"
        value={otherLevel}
        onChange={setOtherLevel}
        accent={theme.colors.semantic.respiratory}
        onBack={resetToGrid}
        busy={busy}
        onSubmit={() => void submitLegacy(cat, otherLevel, null)}
      />
    );
  }

  /* grid */
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Registar sintoma</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
        Toque no sintoma. Em seguida, confirme a intensidade ou o local — é rápido.
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        {GRID_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setWizard(item.go)}
            style={{
              width: "47%",
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
              minHeight: 118,
              justifyContent: "space-between",
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: theme.colors.background.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name={item.icon} size={22} color={accent(item.accent)} />
            </View>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
