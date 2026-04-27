import { useMemo, useState } from "react";
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LineChart } from "react-native-gifted-charts";
import { OncoCard } from "@/components/OncoCard";
import { labelPainRegion } from "@/src/diary/painRegions";
import { symptomLabel, type SymptomDetailKey } from "@/src/diary/symptomCatalog";
import type { SymptomLogRow } from "@/src/diary/symptomLogTypes";
import {
  valueForSymptomDetail,
  filterLogsForSymptomChart,
  historyPrimaryLabelForRow,
  type TimeframeKey,
} from "@/src/diary/symptomLogValue";
import { labelForCtcaeGrade } from "@/src/diary/verbalSeverity";
import type { AppTheme } from "@/src/theme/theme";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: "D", label: "D" },
  { key: "S", label: "S" },
  { key: "M", label: "M" },
  { key: "6M", label: "6M" },
  { key: "A", label: "A" },
];

const ABOUT_DEFAULT =
  "Sintomas como este são frequentes em contexto oncológico. Registrar a intensidade ao longo do tempo ajuda você e a equipe.";

const ABOUT_EXTRA: Partial<Record<SymptomDetailKey, string>> = {
  pain: "A dor pode variar com o tratamento, a posição ou o esforço. Registrar ajuda a perceber padrões e a comunicar com a equipe.",
  fatigue: "A fadiga oncológica é cansaço persistente, não sempre proporcional ao esforço. O registro ajuda a planejar o dia e o descanso.",
  nausea: "A náusea é uma sensação de desconforto no estômago que muitas vezes vem antes do vômito.",
  fever: "A febre pode indicar mudança clínica. Registre a temperatura e acompanhe a evolução no diário para análise da equipe no dashboard.",
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

function notesLineForDetail(notes: string | null, symptomKey: SymptomDetailKey): string | null {
  if (!notes?.trim()) return null;
  try {
    const j = JSON.parse(notes) as { kind?: string; painRegion?: string };
    if (j.kind === "prd_meta" && j.painRegion && symptomKey === "pain") {
      return `Região: ${labelPainRegion(j.painRegion)}`;
    }
  } catch {
    /* plain text */
  }
  return notes;
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
  onDelete?: (id: string) => Promise<void>;
};

function shortDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function SymptomDetailView({ theme, symptomKey, logs, onBack, onAdd, onDelete }: Props) {
  const [tf, setTf] = useState<TimeframeKey>("S");
  const title = symptomLabel(symptomKey);
  const accent = chartColor(theme, symptomKey);
  const isFever = symptomKey === "fever";

  const chartWidth = Math.min(Dimensions.get("window").width - theme.spacing.md * 4, 360);

  const series = useMemo(
    () => filterLogsForSymptomChart(logs, symptomKey, tf, Date.now()),
    [logs, symptomKey, tf]
  );

  const lineData = useMemo(() => {
    return series.map((p) => ({
      value: p.value,
      label: shortDayLabel(p.logged_at),
      dataPointText: isFever ? `${p.value.toFixed(1)}°` : labelForCtcaeGrade(p.value),
    }));
  }, [series, isFever]);

  const hasChart = lineData.length > 0;

  const handleDelete = (id: string) => {
    if (!onDelete) return;
    Alert.alert("Excluir registro", "Deseja realmente excluir este registro de sintoma?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void onDelete(id);
        },
      },
    ]);
  };

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md }}>
        <CircleChromeButton onPress={onBack} accessibilityLabel="Voltar">
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </CircleChromeButton>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary, flex: 1, textAlign: "center" }]} numberOfLines={1}>
          {title}
        </Text>
        <CircleChromeButton onPress={onAdd} accessibilityLabel="Novo registro">
          <FontAwesome name="plus" size={18} color={accent} />
        </CircleChromeButton>
      </View>

      <OncoCard style={{ marginBottom: theme.spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
            padding: 4,
            marginBottom: theme.spacing.md,
            zIndex: 2,
            elevation: 3,
          }}
        >
          {TIMEFRAMES.map((seg) => {
            const active = tf === seg.key;
            return (
              <Pressable
                key={seg.key}
                onPress={() => setTf(seg.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
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
                key={`fever-chart-${tf}`}
                data={lineData}
                width={chartWidth}
                height={200}
                color={accent}
                thickness={3}
                spacing={Math.max(20, chartWidth / Math.max(lineData.length, 1))}
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
            <Text style={{ fontSize: 11, color: theme.colors.text.secondary, marginBottom: 8 }}>
              Grau CTCAE (0 = menor … 5 = maior); eixo Y de baixo para cima.
            </Text>
            {hasChart ? (
              <LineChart
                key={`sev-chart-${tf}-${lineData.length}`}
                data={lineData}
                width={chartWidth}
                height={200}
                color={accent}
                thickness={3}
                spacing={Math.max(18, chartWidth / Math.max(lineData.length, 1))}
                hideDataPoints={lineData.length > 12}
                yAxisColor={theme.colors.border.divider}
                xAxisColor={theme.colors.border.divider}
                yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.text.secondary, fontSize: 9 }}
                curved
                maxValue={5}
                mostNegativeValue={0}
                noOfSections={5}
                yAxisLabelTexts={["0", "1", "2", "3", "4", "5"]}
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

      <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }]}>
        Histórico
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
        {(() => {
          const filtered = logs
            .filter((l) => valueForSymptomDetail(l, symptomKey) !== null)
            .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
            .slice(0, 50);

          if (filtered.length === 0) {
            return (
              <View style={{ padding: theme.spacing.lg, alignItems: "center" }}>
                <Text style={[theme.typography.body, { color: theme.colors.text.tertiary }]}>
                  Nenhum registro no histórico para este sintoma.
                </Text>
              </View>
            );
          }

          return filtered.map((l, idx) => {
            const val = valueForSymptomDetail(l, symptomKey);
            const primary = historyPrimaryLabelForRow(l, symptomKey, val);
            const noteLine = notesLineForDetail(l.notes, symptomKey);
            return (
              <View
                key={l.id}
                style={{
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.md,
                  borderBottomWidth: idx < filtered.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: theme.colors.border.divider,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{primary}</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                      {new Date(l.logged_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}
                    </Text>
                  </View>
                  {onDelete ? (
                    <Pressable
                      onPress={() => handleDelete(l.id)}
                      hitSlop={12}
                      style={{ padding: 4 }}
                    >
                      <FontAwesome name="trash-o" size={18} color={theme.colors.text.tertiary} />
                    </Pressable>
                  ) : null}
                </View>
                {noteLine ? (
                  <Text style={[theme.typography.caption1, { color: theme.colors.text.tertiary, marginTop: 4 }]} numberOfLines={2}>
                    {noteLine}
                  </Text>
                ) : null}
              </View>
            );
          });
        })()}
      </View>
    </View>
  );
}
