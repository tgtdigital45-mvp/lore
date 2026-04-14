import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { OncoCard } from "@/components/OncoCard";
import { appStorage } from "@/src/lib/appStorage";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import type { MonitoringGuideline } from "@/src/types/protocolMonitoring";
import type { ProtocolMonitoringSource } from "@/src/hooks/useProtocolMonitoring";
import type { FiredAlert } from "@/src/lib/protocolMonitoringEval";

function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Segunda-feira da semana civil (ISO). */
function weekStartKey(d = new Date()): string {
  const dd = new Date(d);
  const day = dd.getDay();
  const diff = (day + 6) % 7;
  dd.setDate(dd.getDate() - diff);
  return localDateKey(dd);
}

function categoryLabelPt(category: MonitoringGuideline["category"]): string {
  switch (category) {
    case "symptom":
      return "Sintoma";
    case "exam":
      return "Exame";
    case "dietary_restriction":
      return "Alimentação";
    case "medication":
      return "Medicamento";
    default:
      return category;
  }
}

type Props = {
  loading: boolean;
  source: ProtocolMonitoringSource;
  /** Null quando nenhum protocolo do catálogo foi resolvido. */
  protocolName: string | null;
  guidelines: MonitoringGuideline[];
  /** Regras do protocolo cujos limiares foram ultrapassados (ex.: febre). */
  firedAlerts?: FiredAlert[];
};

export function ProtocolGuidelinesSection({ loading, source, protocolName, guidelines, firedAlerts = [] }: Props) {
  const { theme } = useAppTheme();
  const today = useMemo(() => localDateKey(), []);
  const weekKey = useMemo(() => weekStartKey(), []);

  const symptoms = useMemo(() => guidelines.filter((g) => g.category === "symptom"), [guidelines]);
  const exams = useMemo(() => guidelines.filter((g) => g.category === "exam"), [guidelines]);
  const other = useMemo(
    () => guidelines.filter((g) => g.category === "dietary_restriction" || g.category === "medication"),
    [guidelines]
  );

  const [symptomAnswers, setSymptomAnswers] = useState<Record<string, "yes" | "no" | undefined>>({});
  const [examDone, setExamDone] = useState<Record<string, boolean>>({});

  const guidelineStableKey = useMemo(() => guidelines.map((g) => g.id).join(","), [guidelines]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextSym: Record<string, "yes" | "no" | undefined> = {};
      const nextEx: Record<string, boolean> = {};
      for (const g of guidelines.filter((x) => x.category === "symptom")) {
        const raw = await appStorage.getItem(`pm_sym_${g.id}_${today}`);
        if (raw === "yes" || raw === "no") nextSym[g.id] = raw;
      }
      for (const g of guidelines.filter((x) => x.category === "exam")) {
        const raw = await appStorage.getItem(`pm_exam_${g.id}_${weekKey}`);
        nextEx[g.id] = raw === "1";
      }
      if (!cancelled) {
        setSymptomAnswers(nextSym);
        setExamDone(nextEx);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guidelineStableKey, today, weekKey]);

  const onSymptom = useCallback(
    async (g: MonitoringGuideline, value: "yes" | "no") => {
      await appStorage.setItem(`pm_sym_${g.id}_${today}`, value);
      setSymptomAnswers((prev) => ({ ...prev, [g.id]: value }));
      if (value === "yes" && g.severity_level === "critical") {
        Alert.alert("Atenção", g.action_required, [{ text: "Entendi", style: "default" }]);
      }
    },
    [today]
  );

  const toggleExam = useCallback(
    async (g: MonitoringGuideline) => {
      const next = !examDone[g.id];
      await appStorage.setItem(`pm_exam_${g.id}_${weekKey}`, next ? "1" : "0");
      setExamDone((prev) => ({ ...prev, [g.id]: next }));
    },
    [examDone, weekKey]
  );

  if (loading) {
    return (
      <OncoCard style={{ marginTop: theme.spacing.lg }}>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>A carregar diretrizes…</Text>
      </OncoCard>
    );
  }

  if (!loading && !protocolName) {
    return (
      <OncoCard style={{ marginTop: theme.spacing.lg }}>
        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Monitoramento do protocolo</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          O seu ciclo ainda não está associado a um protocolo do catálogo. A equipa clínica pode associar um protocolo no
          hospital; até lá, continue a registar sintomas no diário.
        </Text>
      </OncoCard>
    );
  }

  if (!loading && protocolName && guidelines.length === 0) {
    return (
      <OncoCard style={{ marginTop: theme.spacing.lg }}>
        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Monitoramento do protocolo</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          O protocolo «{protocolName}» ainda não tem diretrizes de monitoramento configuradas no catálogo.
        </Text>
      </OncoCard>
    );
  }

  return (
    <View style={{ marginTop: theme.spacing.lg }}>
      <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
        Monitoramento do protocolo
      </Text>
      {firedAlerts.length > 0 ? (
        <View style={{ marginBottom: theme.spacing.md, gap: theme.spacing.sm }}>
          {firedAlerts.map((fa) => (
            <View
              key={fa.rule.id}
              style={{
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: "rgba(185, 28, 28, 0.12)",
                borderWidth: 1,
                borderColor: "rgba(185, 28, 28, 0.45)",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#B91C1C" }}>Alerta do protocolo</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: 6 }]}>{fa.message}</Text>
              {fa.rule.action_required ? (
                <Text style={[theme.typography.body, { fontSize: 13, color: theme.colors.text.secondary, marginTop: 6 }]}>
                  {fa.rule.action_required}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {protocolName ? (
        <Text style={[theme.typography.body, { fontSize: 13, color: theme.colors.text.secondary, marginBottom: theme.spacing.md }]}>
          {protocolName}
          {source === "catalog_fallback" ? " · sugestão do catálogo (vincule o protocolo ao ciclo na app do hospital)" : ""}
        </Text>
      ) : null}

      {symptoms.map((g) => {
        const ans = symptomAnswers[g.id];
        const showCritical = ans === "yes" && g.severity_level === "critical";
        return (
          <OncoCard key={g.id} style={{ marginBottom: theme.spacing.md, backgroundColor: theme.colors.background.primary }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, letterSpacing: 0.6 }}>
              {categoryLabelPt(g.category).toUpperCase()} · HOJE
            </Text>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>
              Você sentiu {g.title} hoje?
            </Text>
            {g.description ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>{g.description}</Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <Pressable
                onPress={() => void onSymptom(g, "yes")}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: ans === "yes" ? theme.colors.semantic.respiratory : theme.colors.background.secondary,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "700", color: theme.colors.text.primary }}>Sim</Text>
              </Pressable>
              <Pressable
                onPress={() => void onSymptom(g, "no")}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  backgroundColor: ans === "no" ? theme.colors.semantic.vitals : theme.colors.background.secondary,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "700", color: theme.colors.text.primary }}>Não</Text>
              </Pressable>
            </View>
            {showCritical ? (
              <View
                style={{
                  marginTop: theme.spacing.md,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: "rgba(185, 28, 28, 0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(185, 28, 28, 0.45)",
                }}
              >
                <Text style={{ fontWeight: "800", color: "#B91C1C", marginBottom: 6 }}>Ação recomendada</Text>
                <Text style={[theme.typography.body, { color: "#7F1D1D" }]}>{g.action_required}</Text>
              </View>
            ) : null}
          </OncoCard>
        );
      })}

      {exams.length > 0 ? (
        <OncoCard style={{ marginBottom: theme.spacing.md, backgroundColor: theme.colors.background.primary }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, letterSpacing: 0.6 }}>
            EXAMES · CHECKLIST SEMANAL (SEMANA DE {weekKey})
          </Text>
          {exams.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => void toggleExam(g)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: theme.spacing.sm,
                marginTop: theme.spacing.md,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: examDone[g.id] ? theme.colors.semantic.respiratory : theme.colors.text.tertiary,
                  backgroundColor: examDone[g.id] ? theme.colors.semantic.respiratory : "transparent",
                  marginTop: 2,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{g.title}</Text>
                {g.description ? (
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>{g.description}</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </OncoCard>
      ) : null}

      {other.map((g) => (
        <OncoCard key={g.id} style={{ marginBottom: theme.spacing.md, backgroundColor: theme.colors.background.primary }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, letterSpacing: 0.6 }}>
            {categoryLabelPt(g.category).toUpperCase()}
          </Text>
          <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>{g.title}</Text>
          {g.description ? (
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>{g.description}</Text>
          ) : null}
          <Text style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: theme.spacing.sm, fontWeight: "600" }]}>
            {g.action_required}
          </Text>
        </OncoCard>
      ))}
    </View>
  );
}
