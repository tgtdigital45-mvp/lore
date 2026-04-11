import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { labelInfusionStatus, labelTreatmentKind } from "@/src/i18n/treatment";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import { formatPtDateShort, nextSuggestedInfusionDate } from "@/src/lib/treatmentInfusionSchedule";
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

export default function TreatmentCycleDetailScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/treatment" as Href);
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
    if (cErr || !cRow) {
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
          router.replace("/treatment" as Href);
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
        <Text
          style={[theme.typography.headline, { flex: 1, textAlign: "center", color: theme.colors.text.primary }]}
          numberOfLines={1}
        >
          {cycle?.protocol_name ?? "Ciclo"}
        </Text>
        <Link href={`/treatment/${cycleId}/edit` as Href} asChild>
          <Pressable accessibilityRole="button" style={{ padding: 8 }}>
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
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              {labelTreatmentKind(cycle.treatment_kind ?? "chemotherapy")} · Início {cycle.start_date}
            </Text>
            {cycle.end_date ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                Fim previsto/real: {cycle.end_date}
              </Text>
            ) : null}
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
              Estado: {cycle.status}
              {cycle.planned_sessions != null ? ` · ${cycle.completed_sessions ?? 0}/${cycle.planned_sessions} sessões` : ""}
            </Text>
            {cycle.notes ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>
                {cycle.notes}
              </Text>
            ) : null}
            {cycle.infusion_interval_days != null && cycle.infusion_interval_days >= 1 ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Intervalo no protocolo: {cycle.infusion_interval_days} dia(s) entre infusões
              </Text>
            ) : null}
            {nextSuggestedAt ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: 6, fontWeight: "600" }]}>
                Próxima infusão sugerida: {formatPtDateShort(nextSuggestedAt)}
              </Text>
            ) : cycle.infusion_interval_days != null && cycle.infusion_interval_days >= 1 ? (
              <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginTop: 6 }]}>
                Faça o check-in da próxima sessão agendada para atualizar a sugestão.
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.sm }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Check-ins</Text>
            <Link href={`/treatment/${cycleId}/infusion/new` as Href} asChild>
              <Pressable>
                <Text style={{ color: theme.colors.text.tertiary, fontWeight: "600", fontSize: 13 }}>+ Registo manual</Text>
              </Pressable>
            </Link>
          </View>

          {sortedForDisplay.length === 0 ? (
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
              Sem sessões. Use &quot;Registo manual&quot; para adicionar ou edite o ciclo.
            </Text>
          ) : (
            sortedForDisplay.map((inf, idx) => {
              const n = idx + 1;
              const isDone = inf.status === "completed";
              const isScheduled = inf.status === "scheduled";

              return (
                <View
                  key={inf.id}
                  style={{
                    marginBottom: theme.spacing.sm,
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.md,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
                    <FontAwesome
                      name={isDone ? "check-square" : "square-o"}
                      size={22}
                      color={isDone ? IOS_HEALTH.blue : theme.colors.text.tertiary}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                        Sessão {n}
                      </Text>
                      {isDone ? (
                        <>
                          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                            Realizada: {formatSessionAt(inf.session_at)}
                          </Text>
                          {inf.weight_kg != null ? (
                            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                              Peso: {inf.weight_kg} kg
                            </Text>
                          ) : null}
                          {inf.notes ? (
                            <Text
                              style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: 4 }]}
                              numberOfLines={4}
                            >
                              {inf.notes}
                            </Text>
                          ) : null}
                        </>
                      ) : isScheduled ? (
                        <>
                          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                            Prevista: {formatPredictedDay(inf.session_at)}
                          </Text>
                          <Link href={`/treatment/${cycleId}/checkin?infusionId=${inf.id}` as Href} asChild>
                            <Pressable
                              style={({ pressed }) => ({
                                marginTop: theme.spacing.sm,
                                alignSelf: "flex-start",
                                backgroundColor: IOS_HEALTH.blue,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                borderRadius: IOS_HEALTH.pillButtonRadius,
                                opacity: pressed ? 0.88 : 1,
                              })}
                            >
                              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Fazer check-in</Text>
                            </Pressable>
                          </Link>
                        </>
                      ) : (
                        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                          {labelInfusionStatus(inf.status)} · {formatSessionAt(inf.session_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                  {!isScheduled ? (
                    <Link href={`/treatment/${cycleId}/infusion/${inf.id}` as Href} asChild>
                      <Pressable style={{ marginTop: theme.spacing.sm }}>
                        <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600", fontSize: 14 }}>Ver / editar registo</Text>
                      </Pressable>
                    </Link>
                  ) : null}
                </View>
              );
            })
          )}

          <Pressable
            onPress={confirmDeleteCycle}
            style={{ marginTop: theme.spacing.lg, padding: theme.spacing.md, alignItems: "center" }}
          >
            <Text style={{ color: theme.colors.semantic.vitals, fontWeight: "600" }}>Eliminar ciclo</Text>
          </Pressable>
        </ScrollView>
      )}
    </ResponsiveScreen>
  );
}
