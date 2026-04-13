import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { computeFeverAdaptiveResult } from "@/src/diary/promFlows/feverPilot";
import type { PromFlowResult } from "@/src/diary/promFlows/types";
import type { AppTheme } from "@/src/theme/theme";

type Props = {
  theme: AppTheme;
  onBack: () => void;
  busy: boolean;
  onSubmit: (r: PromFlowResult & { startFeverWatch: boolean }) => void;
};

export function AeFeverFlow({ theme, onBack, busy, onSubmit }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [temp, setTemp] = useState("");
  const [rigors, setRigors] = useState<boolean | null>(null);
  const [mentalOk, setMentalOk] = useState<boolean | null>(null);

  const parseTemp = () => {
    const t = parseFloat(temp.replace(",", "."));
    if (!Number.isFinite(t) || t < 35 || t > 42) return null;
    return t;
  };

  const finish = () => {
    const t = parseTemp();
    if (t === null) return;
    if (rigors === null || mentalOk === null) return;
    const r = computeFeverAdaptiveResult({
      tempC: t,
      rigors,
      mentalStatusOk: mentalOk,
    });
    onSubmit(r);
  };

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
      >
        <Text style={{ fontSize: 22, color: theme.colors.semantic.vitals, fontWeight: "600" }}>‹</Text>
        <Text style={[theme.typography.body, { color: theme.colors.semantic.vitals, marginLeft: 4 }]}>Voltar</Text>
      </Pressable>
      <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Febre (adaptativo)</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
        Se a febre for relevante, o app pode lembrá-lo de registar a temperatura nos próximos dias.
      </Text>

      {step === 0 && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.headline, { marginBottom: theme.spacing.sm }]}>Temperatura agora (°C)</Text>
          <TextInput
            placeholder="ex.: 38,2"
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.text.tertiary}
            value={temp}
            onChangeText={setTemp}
            style={{
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
              if (parseTemp() === null) return;
              setStep(1);
            }}
            style={{
              marginTop: theme.spacing.lg,
              paddingVertical: 14,
              borderRadius: theme.radius.lg,
              alignItems: "center",
              backgroundColor: theme.colors.semantic.vitals,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#fff" }]}>Seguinte</Text>
          </Pressable>
        </View>
      )}

      {step === 1 && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.headline, { marginBottom: theme.spacing.md }]}>Calafrios ou tremores?</Text>
          {(["Sim", "Não"] as const).map((label) => (
            <Pressable
              key={label}
              onPress={() => {
                setRigors(label === "Sim");
                setStep(2);
              }}
              style={{
                marginBottom: theme.spacing.sm,
                paddingVertical: 14,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.background.primary,
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
              }}
            >
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.headline, { marginBottom: theme.spacing.md }]}>Está confuso ou desorientado?</Text>
          {(["Não", "Sim"] as const).map((label) => (
            <Pressable
              key={label}
              onPress={() => {
                setMentalOk(label === "Não");
              }}
              style={{
                marginBottom: theme.spacing.sm,
                paddingVertical: 14,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.background.primary,
                borderWidth: mentalOk === (label === "Não") ? 2 : 1,
                borderColor: mentalOk === (label === "Não") ? theme.colors.semantic.vitals : theme.colors.border.divider,
              }}
            >
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={finish}
            disabled={busy || rigors === null || mentalOk === null}
            style={{
              marginTop: theme.spacing.lg,
              paddingVertical: 14,
              borderRadius: theme.radius.lg,
              alignItems: "center",
              backgroundColor: theme.colors.semantic.vitals,
              opacity: busy || rigors === null || mentalOk === null ? 0.55 : 1,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#fff" }]}>Registar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
