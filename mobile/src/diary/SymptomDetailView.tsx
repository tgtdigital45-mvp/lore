import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LineChart } from "react-native-gifted-charts";
import { OncoCard } from "@/components/OncoCard";
import { symptomLabel, type SymptomDetailKey } from "@/src/diary/symptomCatalog";
import type { SymptomLogRow } from "@/src/diary/symptomLogTypes";
import { filterLogsForSymptomChart, type TimeframeKey } from "@/src/diary/symptomLogValue";
import type { AppTheme } from "@/src/theme/theme";

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: "D", label: "D" },
  { key: "S", label: "S" },
  { key: "M", label: "M" },
  { key: "6M", label: "6M" },
  { key: "A", label: "A" },
];

const ABOUT_DEFAULT =
  "Sintomas como este são frequentes em contexto oncológico. Registrar a intensidade ao longo do tempo ajuda você e a equipe de saúde.";

const ABOUT_EXTRA: Partial<Record<SymptomDetailKey, string>> = {
  pain: "A dor pode variar com o tratamento, a posição ou o esforço. Registrar ajuda a perceber padrões e a comunicar com a equipe.",
  fatigue: "A fadiga oncológica é cansaço persistente, não sempre proporcional ao esforço. O registro ajuda a planejar o dia e o descanso.",
  nausea: "A náusea é uma sensação de desconforto no estômago que muitas vezes vem antes do vômito.",
  fever: "A febre pode ser sinal de infecção. Registre a temperatura e contate a equipe se estiver no período de maior risco ou com outros sintomas.",
  diarrhea: "Alterações do hábito intestinal podem estar ligadas ao tratamento ou a outras causas. O registro ajuda o acompanhamento clínico.",
  hydration: "Manter-se hidratado é importante durante o tratamento. Este registro é orientativo — ajuste com a sua equipe.",
  vomiting: "O vómito pode acompanhar náusea ou ser efeito do tratamento. Registre para ajudar na hidratação e no ajuste terapêutico.",
  constipation: "A prisão de ventre é frequente com certos medicamentos. O registro ajuda a perceber o que funciona para si.",
  cough: "A tosse pode ter várias causas; registre para compartilhar padrões com a equipe.",
  sleep_changes:
    "Alterações do sono são frequentes com o tratamento ou o stress. Registrar ajuda a perceber padrões e a falar com a equipe sobre sono e descanso.",
};

function aboutFor(key: SymptomDetailKey): string {
  return ABOUT_EXTRA[key] ?? ABOUT_DEFAULT;
}

const DIGESTIVE_ACCENT = new Set<SymptomDetailKey>([
  "nausea",
  "diarrhea",
  "vomiting",
  "hydration",
  "constipation",
  "heartburn",
]);

function chartColor(theme: AppTheme, key: SymptomDetailKey): string {
  if (key === "fever") return theme.colors.semantic.vitals;
  if (key === "fatigue") return theme.colors.semantic.treatment;
  if (DIGESTIVE_ACCENT.has(key)) return theme.colors.semantic.respiratory;
  return theme.colors.semantic.symptoms;
}

type Props = {
  theme: AppTheme;
  symptomKey: SymptomDetailKey;
  logs: SymptomLogRow[];
  onBack: () => void;
  onAdd: () => void;
};

function shortDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function SymptomDetailView({ theme, symptomKey, logs, onBack, onAdd }: Props) {
  const [tf, setTf] = useState<TimeframeKey>("S");
  const title = symptomLabel(symptomKey);
  const accent = chartColor(theme, symptomKey);
  const isFever = symptomKey === "fever";

  const series = useMemo(
    () => filterLogsForSymptomChart(logs, symptomKey, tf, Date.now()),
    [logs, symptomKey, tf]
  );

  const lineData = useMemo(() => {
    return series.map((p) => ({
      value: p.value,
      label: shortDayLabel(p.logged_at),
      dataPointText: isFever ? `${p.value.toFixed(1)}°` : String(Math.round(p.value)),
    }));
  }, [series, isFever]);

  const hasChart = lineData.length > 0;

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.background.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary, flex: 1, textAlign: "center" }]} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={onAdd}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Novo registro"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.background.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="plus" size={18} color={accent} />
        </Pressable>
      </View>

      <OncoCard style={{ marginBottom: theme.spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
            padding: 4,
            marginBottom: theme.spacing.md,
          }}
        >
          {TIMEFRAMES.map((seg) => {
            const active = tf === seg.key;
            return (
              <Pressable
                key={seg.key}
                onPress={() => setTf(seg.key)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: theme.radius.sm,
                  backgroundColor: active ? theme.colors.background.primary : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: active ? "700" : "600",
                    color: active ? theme.colors.text.primary : theme.colors.text.secondary,
                  }}
                >
                  {seg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isFever ? (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text style={{ fontSize: 11, color: theme.colors.text.secondary, marginBottom: 8 }}>°C (temperatura)</Text>
            {hasChart ? (
              <LineChart
                data={lineData}
                color={accent}
                thickness={3}
                spacing={Math.max(20, 280 / Math.max(lineData.length, 1))}
                hideDataPoints={lineData.length > 8}
                yAxisColor={theme.colors.border.divider}
                xAxisColor={theme.colors.border.divider}
                yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.text.secondary, fontSize: 9 }}
                curved
                maxValue={42}
                yAxisOffset={35}
                noOfSections={4}
                areaChart
                startFillColor={accent}
                endFillColor={accent}
                startOpacity={0.25}
                endOpacity={0.04}
              />
            ) : (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center", paddingVertical: theme.spacing.lg }]}>
                Sem registros de febre neste período.
              </Text>
            )}
          </View>
        ) : (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: theme.colors.text.tertiary, width: "18%" }}>Grave</Text>
              <Text style={{ fontSize: 10, color: theme.colors.text.tertiary, width: "18%", textAlign: "center" }}>Moderado</Text>
              <Text style={{ fontSize: 10, color: theme.colors.text.tertiary, width: "18%", textAlign: "center" }}>Suave</Text>
              <Text style={{ fontSize: 10, color: theme.colors.text.tertiary, width: "22%", textAlign: "center" }}>Presente</Text>
              <Text style={{ fontSize: 10, color: theme.colors.text.tertiary, width: "22%", textAlign: "right" }}>Não</Text>
            </View>
            {hasChart ? (
              <LineChart
                data={lineData}
                color={accent}
                thickness={3}
                spacing={Math.max(18, 260 / Math.max(lineData.length, 1))}
                hideDataPoints={lineData.length > 12}
                yAxisColor={theme.colors.border.divider}
                xAxisColor={theme.colors.border.divider}
                yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.text.secondary, fontSize: 9 }}
                curved
                maxValue={10}
                noOfSections={5}
                yAxisLabelTexts={["10", "8", "6", "4", "2", "0"]}
              />
            ) : (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center", paddingVertical: theme.spacing.lg }]}>
                Sem registros neste período para este sintoma.
              </Text>
            )}
          </View>
        )}
      </OncoCard>

      <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Sobre {title}</Text>
      <OncoCard>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, lineHeight: 22 }]}>{aboutFor(symptomKey)}</Text>
      </OncoCard>

      <Pressable
        onPress={onAdd}
        style={{
          marginTop: theme.spacing.lg,
          backgroundColor: accent,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.lg,
          alignItems: "center",
        }}
      >
        <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Registrar {title.toLowerCase()}</Text>
      </Pressable>
    </View>
  );
}
