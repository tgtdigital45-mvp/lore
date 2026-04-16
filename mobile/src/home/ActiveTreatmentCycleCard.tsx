import { Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AppTheme } from "@/src/theme/theme";
import { OncoCard } from "@/components/OncoCard";
import { labelTreatmentKind } from "@/src/i18n/treatment";
import { nextPendingScheduledInfusion } from "@/src/lib/treatmentInfusionSchedule";
import type { TreatmentCycleRow, TreatmentInfusionRow } from "@/src/types/treatment";
import { TreatmentActivityRings } from "@/src/home/TreatmentActivityRings";

function formatSessionAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function cycleDayNumber(startDate: string): number {
  const s = new Date(startDate.includes("T") ? startDate : `${startDate}T12:00:00`);
  const diff = Math.floor((Date.now() - s.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

export function sessionRingProgress(cycle: TreatmentCycleRow): number {
  const planned = cycle.planned_sessions;
  const done = cycle.completed_sessions ?? 0;
  if (planned != null && planned > 0) return Math.min(1, done / planned);
  return 0;
}

function lastNextInfusion(infusions: TreatmentInfusionRow[], cycleLast: string | null) {
  const completed = infusions
    .filter((i) => i.status === "completed")
    .sort((a, b) => new Date(b.session_at).getTime() - new Date(a.session_at).getTime());
  const lastIso = completed[0]?.session_at ?? cycleLast;
  const next = nextPendingScheduledInfusion(infusions);
  return { lastIso, next };
}

type Props = {
  theme: AppTheme;
  activeCycle: TreatmentCycleRow;
  infusions: TreatmentInfusionRow[];
  onPress: () => void;
  /** Landing Tratamento: mesmo card do Resumo, sem o título do protocolo */
  hideProtocolName?: boolean;
};

const RING_SIZE = 118;

export function ActiveTreatmentCycleCard({
  theme,
  activeCycle,
  infusions,
  onPress,
  hideProtocolName = false,
}: Props) {
  const { lastIso, next: nextInfusion } = lastNextInfusion(infusions, activeCycle.last_session_at ?? null);
  const track = theme.colors.background.tertiary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Abrir acompanhamento do ciclo de tratamento"
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: theme.spacing.sm, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.semantic.vitals }} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, letterSpacing: 0.8 }}>
                TRATAMENTO ATIVO
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text.secondary, marginTop: 4 }}>
              {labelTreatmentKind(activeCycle.treatment_kind ?? "chemotherapy")}
            </Text>
            {!hideProtocolName ? (
              <Text
                style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.xs }]}
                numberOfLines={2}
              >
                {activeCycle.protocol_name}
              </Text>
            ) : null}
            {activeCycle.planned_sessions != null ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: hideProtocolName ? theme.spacing.sm : 4 }]}>
                {activeCycle.completed_sessions ?? 0} / {activeCycle.planned_sessions} sessões
              </Text>
            ) : null}
            <View style={{ marginTop: theme.spacing.md, gap: 6 }}>
              <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
                <Text style={{ fontWeight: "700", color: theme.colors.text.primary }}>Última infusão: </Text>
                {lastIso ? formatSessionAt(lastIso) : "—"}
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
                <Text style={{ fontWeight: "700", color: theme.colors.text.primary }}>Próxima: </Text>
                {nextInfusion ? formatSessionAt(nextInfusion.session_at) : "Sem sessão agendada"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: theme.spacing.md, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.semantic.respiratory }}>Ver acompanhamento do ciclo</Text>
              <FontAwesome name="chevron-right" size={12} color={theme.colors.semantic.respiratory} />
            </View>
          </View>
          <View style={{ alignItems: "center", justifyContent: "flex-start" }}>
            <TreatmentActivityRings
              size={RING_SIZE}
              trackColor={track}
              ring={{
                radius: 46,
                strokeWidth: 9,
                progress: sessionRingProgress(activeCycle),
                color: theme.colors.semantic.vitals,
              }}
            />
            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, marginTop: 4 }}>
              Dia {cycleDayNumber(activeCycle.start_date)}
            </Text>
          </View>
        </View>
      </OncoCard>
    </Pressable>
  );
}
