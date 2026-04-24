import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { OncoCard } from "@/components/OncoCard";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import {
  labelCycleStatus,
  labelInfusionStatus,
  labelTreatmentKind,
} from "@/src/i18n/treatment";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import {
  TREATMENT_HREF,
  treatmentCheckinHref,
  treatmentCycleEditHref,
  treatmentInfusionDetailHref,
  treatmentInfusionNewHref,
} from "@/src/navigation/treatmentRoutes";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import {
  formatPtDateShort,
  isPastPredictedCalendarDay,
  nextSuggestedInfusionDate,
} from "@/src/lib/treatmentInfusionSchedule";
import { supabase } from "@/src/lib/supabase";
import type { TreatmentCycleRow, TreatmentInfusionRow } from "@/src/types/treatment";

function formatSessionAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatPredictedDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCycleDatePt(value: string): string {
  const d = value.includes("T") ? new Date(value) : new Date(`${value.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TreatmentCycleDetailScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack(TREATMENT_HREF.index);
  const { cycleId } = useLocalSearchParams<{ cycleId: string }>();
  const { patient } = usePatient();
  const { refresh: refreshCycles, fetchInfusions } = useTreatmentCycles(patient);

  const [cycle, setCycle] = useState<TreatmentCycleRow | null>(null);
  const [infusions, setInfusions] = useState<TreatmentInfusionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!cycleId || !patient) {
      setCycle(null);
      setInfusions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: cRow, error: cErr }, inf] = await Promise.all([
      supabase.from("treatment_cycles").select("*").eq("id", cycleId).eq("patient_id", patient.id).maybeSingle(),
      fetchInfusions(cycleId),
    ]);
    if (cErr) {
      Alert.alert("Erro", cErr.message ?? "Não foi possível carregar o ciclo.");
      setCycle(null);
    } else if (!cRow) {
      Alert.alert("Ciclo", "Ciclo não encontrado ou sem permissão.");
      setCycle(null);
    } else {
      setCycle(cRow as TreatmentCycleRow);
    }
    setInfusions(inf);
    setLoading(false);
  }, [cycleId, patient, fetchInfusions]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const nextSuggestedAt = useMemo(() => {
    if (!cycle) return null;
    const n = cycle.infusion_interval_days;
    return nextSuggestedInfusionDate(n, infusions);
  }, [cycle, infusions]);

  const sortedForDisplay = useMemo(() => {
    return [...infusions].sort((a, b) => new Date(a.session_at).getTime() - new Date(b.session_at).getTime());
  }, [infusions]);

  const headerTitle = cycle ? labelTreatmentKind(cycle.treatment_kind ?? "chemotherapy") : "Ciclo";

  const planned = cycle?.planned_sessions ?? 0;
  const completed = Math.min(cycle?.completed_sessions ?? 0, planned > 0 ? planned : Infinity);

  function confirmDeleteCycle() {
    if (!cycle) return;
    Alert.alert("Eliminar ciclo", "Isto remove o ciclo e todo o histórico de infusões associado.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("treatment_cycles").delete().eq("id", cycle.id);
          if (error) {
            Alert.alert("Erro", error.message);
            return;
          }
          await refreshCycles();
          router.dismissAll();
        },
      },
    ]);
  }

  if (!cycleId) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <Text style={{ padding: 16 }}>Ciclo inválido.</Text>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <CircleChromeButton accessibilityLabel="Voltar" onPress={goBack}>
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </CircleChromeButton>
        <View style={{ flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: theme.spacing.xs }}>
          <Text
            style={[theme.typography.title2, { textAlign: "center", color: theme.colors.text.primary }]}
            numberOfLines={2}
          >
            {loading ? "…" : headerTitle}
          </Text>
        </View>
        <Link href={treatmentCycleEditHref(cycleId)} asChild>
          <Pressable accessibilityRole="button" style={{ padding: 8, width: 34, alignItems: "center" }}>
            <FontAwesome name="pencil" size={18} color={IOS_HEALTH.blue} />
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: 24 }} />
      ) : !cycle ? (
        <Text style={{ padding: theme.spacing.md, color: theme.colors.text.secondary }}>Ciclo não encontrado.</Text>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: "transparent" }}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 }}
        >
          <View
            style={{
              ...IOS_HEALTH.shadow.card,
              backgroundColor: theme.colors.background.primary,
              borderRadius: IOS_HEALTH.groupedListRadius,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
            }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
              <View
                style={{
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 6,
                  borderRadius: IOS_HEALTH.pillButtonRadius,
                  backgroundColor: `${IOS_HEALTH.blue}18`,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: IOS_HEALTH.blue }}>
                  {labelTreatmentKind(cycle.treatment_kind ?? "chemotherapy")}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 6,
                  borderRadius: IOS_HEALTH.pillButtonRadius,
                  backgroundColor: theme.colors.background.secondary,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.text.secondary }}>
                  {labelCycleStatus(cycle.status)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text.tertiary, marginBottom: 4 }}>
                  Início
                </Text>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                  {formatCycleDatePt(cycle.start_date)}
                </Text>
              </View>
              {cycle.end_date ? (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text.tertiary, marginBottom: 4 }}>
                    Fim
                  </Text>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                    {formatCycleDatePt(cycle.end_date)}
                  </Text>
                </View>
              ) : null}
            </View>

            {planned > 0 ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text.tertiary }}>Sessões</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text.primary, fontWeight: "700" }]}>
                    {completed} de {planned}
                  </Text>
                </View>
                <View
                  style={{
                    marginTop: 8,
                    flexDirection: "row",
                    height: 8,
                    borderRadius: 4,
                    overflow: "hidden",
                    backgroundColor: theme.colors.border.divider,
                  }}
                >
                  <View
                    style={{
                      flex: Math.max(0, completed),
                      backgroundColor: IOS_HEALTH.blue,
                      minWidth: completed > 0 ? 4 : 0,
                    }}
                  />
                  <View style={{ flex: Math.max(0, planned - completed) }} />
                </View>
              </View>
            ) : null}

            {cycle.infusion_interval_days != null && cycle.infusion_interval_days >= 1 ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }]}>
                Intervalo entre sessões: {cycle.infusion_interval_days} dia(s)
              </Text>
            ) : null}

            {nextSuggestedAt ? (
              <View
                style={{
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.background.secondary,
                  marginBottom: theme.spacing.sm,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text.tertiary, marginBottom: 4 }}>
                  Próxima sessão sugerida
                </Text>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                  {formatPtDateShort(nextSuggestedAt)}
                </Text>
              </View>
            ) : cycle.infusion_interval_days != null && cycle.infusion_interval_days >= 1 ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.sm }]}>
                Confirme a próxima sessão agendada no check-in para atualizar a sugestão de data.
              </Text>
            ) : null}

            {cycle.notes ? (
              <View
                style={{
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border.divider,
                  marginTop: theme.spacing.xs,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.colors.text.tertiary, marginBottom: 6 }}>
                  Notas
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.primary }]}>{cycle.notes}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sessões e check-ins</Text>
              <Link href={treatmentInfusionNewHref(cycleId)} asChild>
                <Pressable hitSlop={8}>
                  <Text style={{ color: IOS_HEALTH.blue, fontWeight: "700", fontSize: 14 }}>+ Manual</Text>
                </Pressable>
              </Link>
            </View>
            <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginTop: 8, fontSize: 13 }]}>
              Sessões pendentes aparecem em destaque. Toque para confirmar após a visita; canceladas e concluídas ficam
              registradas abaixo.
            </Text>
          </View>

          {sortedForDisplay.length === 0 ? (
            <View
              style={{
                padding: theme.spacing.lg,
                borderRadius: IOS_HEALTH.groupedListRadius,
                backgroundColor: theme.colors.background.primary,
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textAlign: "center" }]}>
                Sem sessões neste ciclo. Use &quot;+ Manual&quot; ou edite o ciclo para planejar sessões.
              </Text>
            </View>
          ) : (
            <View style={{ gap: theme.spacing.lg }}>
              {sortedForDisplay.map((inf, idx) => {
                const n = idx + 1;
                const isDone = inf.status === "completed";
                const isScheduled = inf.status === "scheduled";
                const isCancelled = inf.status === "cancelled";
                const overdue = isScheduled && isPastPredictedCalendarDay(inf.session_at);

                const chipLabel = isDone ? "Realizada" : isScheduled ? "Pendente" : labelInfusionStatus(inf.status);
                const chipColor = isDone ? IOS_HEALTH.blue : isScheduled ? IOS_HEALTH.blue : theme.colors.text.tertiary;

                const iconName = isDone
                  ? ("check-circle" as const)
                  : isCancelled
                    ? ("ban" as const)
                    : overdue
                      ? ("exclamation-circle" as const)
                      : ("clock-o" as const);
                const iconColor = isCancelled
                  ? theme.colors.text.tertiary
                  : overdue
                    ? theme.colors.semantic.vitals
                    : IOS_HEALTH.blue;

                const cardSurface = {
                  ...IOS_HEALTH.shadow.card,
                  backgroundColor: isCancelled ? theme.colors.background.secondary : theme.colors.background.primary,
                  ...(isCancelled ? { opacity: 0.92 } : {}),
                };

                const iconBoxStyle = {
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: theme.colors.background.secondary,
                  alignItems: "center" as const,
                  justifyContent: "center" as const,
                };

                const pillCtaStyle = {
                  marginTop: theme.spacing.md,
                  alignSelf: "stretch" as const,
                  backgroundColor: IOS_HEALTH.blue,
                  paddingVertical: 12,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: IOS_HEALTH.pillButtonRadius,
                  alignItems: "center" as const,
                };

                const body: ReactNode = isScheduled ? (
                  <>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                      Data prevista: {formatPredictedDay(inf.session_at)}
                    </Text>
                    {overdue ? (
                      <Text
                        style={[
                          theme.typography.body,
                          { color: theme.colors.semantic.vitals, marginTop: 8, fontWeight: "700" },
                        ]}
                      >
                        Sem confirmação — toque para registrar o check-in se a sessão já foi feita.
                      </Text>
                    ) : (
                      <Text
                        style={[theme.typography.body, { color: theme.colors.text.tertiary, marginTop: 8, fontSize: 13 }]}
                      >
                        Pode confirmar na unidade; a hora gravada será a do check-in.
                      </Text>
                    )}
                    <View style={pillCtaStyle}>
                      <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Fazer check-in</Text>
                    </View>
                  </>
                ) : isDone ? (
                  <>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                      Registrada: {formatSessionAt(inf.session_at)}
                    </Text>
                    {inf.weight_kg != null ? (
                      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                        Peso: {inf.weight_kg} kg
                      </Text>
                    ) : null}
                    {inf.notes ? (
                      <Text
                        style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: 8 }]}
                        numberOfLines={4}
                      >
                        {inf.notes}
                      </Text>
                    ) : null}
                    <Link href={treatmentInfusionDetailHref(cycleId, inf.id)} asChild>
                      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                        <View style={pillCtaStyle}>
                          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Ver ou editar registro</Text>
                        </View>
                      </Pressable>
                    </Link>
                  </>
                ) : (
                  <>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                      {labelInfusionStatus(inf.status)} · {formatSessionAt(inf.session_at)}
                    </Text>
                    <Link href={treatmentInfusionDetailHref(cycleId, inf.id)} asChild>
                      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                        <View style={pillCtaStyle}>
                          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Ver ou editar registro</Text>
                        </View>
                      </Pressable>
                    </Link>
                  </>
                );

                const card = (
                  <OncoCard style={cardSurface}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
                      <View style={iconBoxStyle}>
                        <FontAwesome name={iconName} size={22} color={iconColor} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: theme.spacing.sm,
                          }}
                        >
                          <Text
                            style={[theme.typography.headline, { color: theme.colors.text.primary, flex: 1 }]}
                            numberOfLines={2}
                          >
                            Sessão {n}
                          </Text>
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 8,
                              backgroundColor: isCancelled ? theme.colors.border.divider : `${chipColor}22`,
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "700", color: chipColor }}>{chipLabel}</Text>
                          </View>
                        </View>
                        {body}
                      </View>
                    </View>
                  </OncoCard>
                );

                if (isScheduled) {
                  return (
                    <Link key={inf.id} href={treatmentCheckinHref(cycleId, inf.id)} asChild>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Confirmar check-in da sessão ${n}`}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.94 : 1,
                        })}
                      >
                        {card}
                      </Pressable>
                    </Link>
                  );
                }

                return <View key={inf.id}>{card}</View>;
              })}
            </View>
          )}

          <Pressable
            onPress={confirmDeleteCycle}
            style={{ marginTop: theme.spacing.lg, padding: theme.spacing.md, alignItems: "center" }}
          >
            <Text style={{ color: theme.colors.semantic.vitals, fontWeight: "700" }}>Eliminar ciclo</Text>
          </Pressable>
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
