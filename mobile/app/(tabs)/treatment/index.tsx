import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { Link, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CategoryMoreSection } from "@/src/health/components/CategoryMoreSection";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { ActiveTreatmentCycleCard } from "@/src/home/ActiveTreatmentCycleCard";
import { labelTreatmentKind } from "@/src/i18n/treatment";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePinnedCategoryShortcut } from "@/src/hooks/usePinnedCategoryShortcut";
import { useStackBack } from "@/src/hooks/useStackBack";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import type { TreatmentInfusionRow } from "@/src/types/treatment";

function formatDateBr(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function TreatmentIndexScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health" as Href);
  const { patient } = usePatient();
  const { cycles, loading, refresh, fetchInfusions } = useTreatmentCycles(patient);
  const { pinned, toggle, ready: pinReady } = usePinnedCategoryShortcut("treatment");

  const [activeInfusions, setActiveInfusions] = useState<TreatmentInfusionRow[]>([]);

  const activeCycle = useMemo(() => cycles.find((c) => c.status === "active") ?? null, [cycles]);

  const sortedCycles = useMemo(() => {
    const rank = (s: string) => (s === "active" ? 0 : s === "completed" ? 1 : 2);
    return [...cycles].sort((a, b) => rank(a.status) - rank(b.status));
  }, [cycles]);

  /** Histórico: não repetir o ciclo já destacado no card do topo */
  const historyCycles = useMemo(() => {
    if (!activeCycle) return sortedCycles;
    return sortedCycles.filter((c) => c.id !== activeCycle.id);
  }, [sortedCycles, activeCycle]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!activeCycle?.id) {
      setActiveInfusions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await fetchInfusions(activeCycle.id);
      if (!cancelled) setActiveInfusions(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCycle?.id, fetchInfusions]);

  const openActiveCycle = useCallback(() => {
    if (activeCycle?.id) {
      router.push(`/(tabs)/treatment/${activeCycle.id}` as Href);
    }
  }, [activeCycle?.id, router]);

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
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "600",
            color: theme.colors.text.primary,
            letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
          }}
        >
          Tratamento
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        {!patient ? (
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
            Complete o cadastro do paciente para gerir ciclos.
          </Text>
        ) : loading ? (
          <ActivityIndicator size="large" color={IOS_HEALTH.blue} style={{ marginTop: theme.spacing.xl }} />
        ) : (
          <>
            {/* 1 — Ciclo ativo (igual Resumo, sem nome do protocolo) */}
            {activeCycle ? (
              <View style={{ marginBottom: theme.spacing.lg }}>
                <ActiveTreatmentCycleCard
                  theme={theme}
                  activeCycle={activeCycle}
                  infusions={activeInfusions}
                  onPress={openActiveCycle}
                  hideProtocolName
                />
              </View>
            ) : null}

            {/* 2 — Novo ciclo */}
            <Pressable
              onPress={() => router.push("/treatment/kind" as Href)}
              style={({ pressed }) => ({
                marginBottom: theme.spacing.lg,
                backgroundColor: theme.colors.semantic.treatment,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.radius.md,
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Novo ciclo</Text>
            </Pressable>

            {/* 3 — Histórico de ciclos */}
            {cycles.length === 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.background.primary,
                  borderRadius: IOS_HEALTH.groupedListRadius,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.lg,
                  ...IOS_HEALTH.shadow.card,
                }}
              >
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Ainda sem ciclos</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                  Quando criar um ciclo, o histórico aparece aqui. Use «Novo ciclo» para começar.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
                  Histórico de ciclos
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.md, fontSize: 13 }]}>
                  {activeCycle
                    ? "Outros ciclos registados. O ciclo ativo está acima."
                    : "Todos os ciclos registados. O ativo tem prioridade para check-ins."}
                </Text>
                {historyCycles.length === 0 ? (
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
                    Só existe o ciclo atual neste momento.
                  </Text>
                ) : (
                  historyCycles.map((c) => (
                    <Link key={c.id} href={`/treatment/${c.id}` as Href} asChild>
                      <Pressable
                        style={({ pressed }) => ({
                          marginBottom: theme.spacing.sm,
                          backgroundColor: theme.colors.background.primary,
                          borderRadius: 12,
                          paddingVertical: theme.spacing.md,
                          paddingHorizontal: theme.spacing.md,
                          opacity: pressed ? 0.92 : 1,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.06,
                          shadowRadius: 4,
                          elevation: 2,
                        })}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                            <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                              {c.protocol_name}
                            </Text>
                            <Text style={{ fontSize: 14, color: theme.colors.text.secondary, marginTop: 6 }} numberOfLines={2}>
                              {`${labelTreatmentKind(c.treatment_kind ?? "chemotherapy")} · ${
                                c.planned_sessions != null
                                  ? `${c.completed_sessions ?? 0}/${c.planned_sessions} sessões`
                                  : "—"
                              } · ${formatDateBr(c.start_date)}`}
                            </Text>
                            <Text style={{ fontSize: 12, color: IOS_HEALTH.blue, marginTop: 8, fontWeight: "600" }}>
                              {c.status === "active"
                                ? "Toque para check-ins e sessões"
                                : c.status === "completed"
                                  ? "Toque para ver histórico"
                                  : "Toque para detalhes"}
                            </Text>
                          </View>
                          <FontAwesome name="chevron-right" size={16} color={theme.colors.text.tertiary} />
                        </View>
                      </Pressable>
                    </Link>
                  ))
                )}
              </>
            )}

            {/* 4 — Sobre quimios */}
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                marginTop: theme.spacing.sm,
                marginBottom: theme.spacing.lg,
                ...IOS_HEALTH.shadow.card,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 112,
                  borderRadius: theme.radius.md,
                  backgroundColor: "#0A1628",
                  marginBottom: theme.spacing.md,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="heartbeat" size={40} color="#FFFFFF" />
              </View>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sobre quimios</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Acompanhe o seu protocolo, sessões e check-ins num só sítio. Registar ajuda a antecipar efeitos e a comunicar com a
                equipa.
              </Text>
            </View>

            {/* 5–7 — Mais */}
            {patient && pinReady ? (
              <CategoryMoreSection
                theme={theme}
                pinned={pinned}
                onTogglePin={() => void toggle()}
                onExportPdf={() => router.push("/reports" as Href)}
                onOptionsPress={() => Alert.alert("Opções", "Preferências de tratamento em breve.")}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </ResponsiveScreen>
  );
}
