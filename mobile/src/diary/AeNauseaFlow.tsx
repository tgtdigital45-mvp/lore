import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { computeNauseaAdaptiveResult } from "@/src/diary/promFlows/nauseaPilot";
import type { PromFlowResult } from "@/src/diary/promFlows/types";
import type { AppTheme } from "@/src/theme/theme";

type Props = {
  theme: AppTheme;
  onBack: () => void;
  busy: boolean;
  onSubmit: (r: PromFlowResult) => void;
};

export function AeNauseaFlow({ theme, onBack, busy, onSubmit }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [present, setPresent] = useState<boolean | null>(null);
  const [vomit, setVomit] = useState<"none" | "1_2" | "3_plus" | null>(null);
  const [intake, setIntake] = useState<"normal" | "reduced" | "none" | null>(null);

  const finish = () => {
    if (present === null) return;
    if (present && (vomit === null || intake === null)) return;
    const r = computeNauseaAdaptiveResult({
      nauseaPresent: present,
      vomitingEpisodes: present ? vomit ?? undefined : undefined,
      intakeImpact: present ? intake ?? undefined : undefined,
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
        <Text style={{ fontSize: 22, color: theme.colors.semantic.symptoms, fontWeight: "600" }}>‹</Text>
        <Text style={[theme.typography.body, { color: theme.colors.semantic.symptoms, marginLeft: 4 }]}>Voltar</Text>
      </Pressable>
      <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Náusea (adaptativo)</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
        Perguntas curtas — a equipa vê o grau clínico (CTCAE).
      </Text>

      {step === 0 && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.headline, { marginBottom: theme.spacing.md }]}>Sentiu náusea nas últimas 24h?</Text>
          {(["Sim", "Não"] as const).map((label) => (
            <Pressable
              key={label}
              onPress={() => {
                setPresent(label === "Sim");
                setStep(1);
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

      {step === 1 && present === true && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.headline, { marginBottom: theme.spacing.md }]}>Vómitos?</Text>
          {(
            [
              ["Nenhum ou raro", "none"],
              ["1 a 2 episódios", "1_2"],
              ["3 ou mais", "3_plus"],
            ] as const
          ).map(([label, v]) => (
            <Pressable
              key={v}
              onPress={() => {
                setVomit(v);
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

      {step === 1 && present === false && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Pressable
            onPress={finish}
            disabled={busy}
            style={{
              paddingVertical: 14,
              borderRadius: theme.radius.lg,
              alignItems: "center",
              backgroundColor: theme.colors.semantic.symptoms,
              opacity: busy ? 0.55 : 1,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#fff" }]}>Concluir</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && present === true && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={[theme.typography.headline, { marginBottom: theme.spacing.md }]}>Ingestão de líquidos / comida</Text>
          {(
            [
              ["Normal", "normal"],
              ["Reduzida", "reduced"],
              ["Quase nada", "none"],
            ] as const
          ).map(([label, v]) => (
            <Pressable
              key={v}
              onPress={() => {
                setIntake(v);
              }}
              style={{
              marginBottom: theme.spacing.sm,
              paddingVertical: 14,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.background.primary,
              borderWidth: intake === v ? 2 : 1,
              borderColor: intake === v ? theme.colors.semantic.symptoms : theme.colors.border.divider,
            }}
            >
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={finish}
            disabled={busy || intake === null}
            style={{
              marginTop: theme.spacing.lg,
              paddingVertical: 14,
              borderRadius: theme.radius.lg,
              alignItems: "center",
              backgroundColor: theme.colors.semantic.symptoms,
              opacity: busy || intake === null ? 0.55 : 1,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#fff" }]}>Registar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
