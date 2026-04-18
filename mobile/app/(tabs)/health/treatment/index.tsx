import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
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
import { OncoCard } from "@/components/OncoCard";
import type { Href } from "expo-router";
import { Link, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CategoryMoreSection } from "@/src/health/components/CategoryMoreSection";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { ActiveTreatmentCycleCard } from "@/src/home/ActiveTreatmentCycleCard";
import { labelCycleStatus, labelTreatmentKind } from "@/src/i18n/treatment";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePinnedCategoryShortcut } from "@/src/hooks/usePinnedCategoryShortcut";
import { useStackBack } from "@/src/hooks/useStackBack";
import { TREATMENT_HREF, treatmentCycleHref } from "@/src/navigation/treatmentRoutes";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import type { TreatmentInfusionRow } from "@/src/types/treatment";

function formatDateBr(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function treatmentKindFaIcon(kind: string | null | undefined): ComponentProps<typeof FontAwesome>["name"] {
  switch (kind) {
    case "radiotherapy":
      return "dot-circle-o";
    case "hormone":
      return "medkit";
    case "immunotherapy":
      return "shield";
    case "other":
      return "ellipsis-h";
    default:
      return "heartbeat";
  }
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
      router.push(treatmentCycleHref(activeCycle.id));
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
              onPress={() => router.push(TREATMENT_HREF.kind)}
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
                <View style={{ marginBottom: theme.spacing.md }}>
                  <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.xs }]}>
                    Histórico de ciclos
                  </Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, fontSize: 13 }]}>
                    {activeCycle
                      ? "Outros ciclos registados. O ciclo ativo está acima."
                      : "Todos os ciclos registados. O ativo tem prioridade para check-ins."}
                  </Text>
                </View>
                {historyCycles.length === 0 ? (
                  <OncoCard
                    style={{
                      backgroundColor: theme.colors.background.primary,
                      marginBottom: theme.spacing.lg,
                      ...IOS_HEALTH.shadow.card,
                    }}
                  >
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                      Só existe o ciclo atual neste momento.
                    </Text>
                  </OncoCard>
                ) : (
                  <View style={{ gap: theme.spacing.lg }}>
                  {historyCycles.map((c) => {
                    const status = c.status ?? "";
                    const badgeFg =
                      status === "active"
                        ? theme.colors.semantic.vitals
                        : status === "completed"
                          ? theme.colors.semantic.nutrition
                          : status === "suspended"
                            ? theme.colors.semantic.symptoms
                            : theme.colors.text.secondary;
                    return (
                      <Link key={c.id} href={treatmentCycleHref(c.id)} asChild>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${c.protocol_name}, ${labelCycleStatus(status)}`}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.92 : 1,
                          })}
                        >
                          <OncoCard
                            style={{
                              backgroundColor: theme.colors.background.primary,
                              ...IOS_HEALTH.shadow.card,
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
                              <View
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 14,
                                  backgroundColor: theme.colors.background.secondary,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <FontAwesome
                                  name={treatmentKindFaIcon(c.treatment_kind)}
                                  size={22}
                                  color={theme.colors.semantic.treatment}
                                />
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
                                    {c.protocol_name}
                                  </Text>
                                  <View
                                    style={{
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 8,
                                      backgroundColor: theme.colors.background.secondary,
                                    }}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: badgeFg, letterSpacing: 0.2 }}>
                                      {labelCycleStatus(status)}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={{
                                    fontSize: 14,
                                    color: theme.colors.text.secondary,
                                    marginTop: 6,
                                    lineHeight: 20,
                                  }}
                                  numberOfLines={2}
                                >
                                  {`${labelTreatmentKind(c.treatment_kind ?? "chemotherapy")} · ${
                                    c.planned_sessions != null
                                      ? `${c.completed_sessions ?? 0}/${c.planned_sessions} sessões`
                                      : "—"
                                  } · Início ${formatDateBr(c.start_date)}`}
                                </Text>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginTop: theme.spacing.sm,
                                  }}
                                >
                                  <Text style={{ fontSize: 13, fontWeight: "600", color: IOS_HEALTH.blue }}>
                                    {status === "active"
                                      ? "Check-ins e sessões"
                                      : status === "completed"
                                        ? "Ver histórico do ciclo"
                                        : "Detalhes do ciclo"}
                                  </Text>
                                  <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                                </View>
                              </View>
                            </View>
                          </OncoCard>
                        </Pressable>
                      </Link>
                    );
                  })}
                  </View>
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
