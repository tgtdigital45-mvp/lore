import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { Href } from "expo-router";
import { Link, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { appStorage } from "@/src/lib/appStorage";
import { OnboardingWalkthrough } from "@/src/components/OnboardingWalkthrough";
import { OncoCard } from "@/components/OncoCard";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { ProfileSheet } from "@/src/home/ProfileSheet";
import { AVATAR_STORAGE_KEY, getWidgetLabel, loadPinnedWidgetIds, savePinnedWidgetIds } from "@/src/home/resumoWidgets";
import { TreatmentActivityRings } from "@/src/home/TreatmentActivityRings";
import { useHomeSummary } from "@/src/home/useHomeSummary";
import { WidgetPickerModal } from "@/src/home/WidgetPickerModal";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useMedications } from "@/src/hooks/useMedications";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import { nextMedicationSlot } from "@/src/lib/medicationNotifications";
import { labelTreatmentKind } from "@/src/i18n/treatment";
import { documentTypeLabel, labelCancerType, labelSymptomCategory } from "@/src/i18n/ui";
import { supabase } from "@/src/lib/supabase";
import type { TreatmentCycleRow, TreatmentInfusionRow } from "@/src/types/treatment";

const MONTHS_SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} de ${MONTHS_SHORT[d.getMonth()] ?? ""}`;
}

function formatSessionAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function cycleDayNumber(startDate: string): number {
  const s = new Date(startDate.includes("T") ? startDate : `${startDate}T12:00:00`);
  const diff = Math.floor((Date.now() - s.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

function lastNextInfusion(infusions: TreatmentInfusionRow[], cycleLast: string | null) {
  const now = Date.now();
  const completed = infusions
    .filter((i) => i.status === "completed")
    .sort((a, b) => new Date(b.session_at).getTime() - new Date(a.session_at).getTime());
  const lastIso = completed[0]?.session_at ?? cycleLast;
  const upcoming = infusions
    .filter((i) => i.status === "scheduled" && new Date(i.session_at).getTime() > now)
    .sort((a, b) => new Date(a.session_at).getTime() - new Date(b.session_at).getTime());
  const next = upcoming[0];
  return { lastIso, next };
}

function sessionRingProgress(cycle: TreatmentCycleRow): number {
  const planned = cycle.planned_sessions;
  const done = cycle.completed_sessions ?? 0;
  if (planned != null && planned > 0) return Math.min(1, done / planned);
  return 0;
}

function hrefForPinnedWidget(widgetId: string): Href | null {
  if (widgetId.startsWith("lab:")) return "/(tabs)/exams" as Href;
  if (widgetId.startsWith("symptom:")) return "/(tabs)/diary" as Href;
  if (widgetId.startsWith("nutrition:")) return "/(tabs)/health/nutrition" as Href;
  if (widgetId === "vital:steps") return "/(tabs)/health" as Href;
  if (widgetId.startsWith("vital:")) return "/(tabs)/health/vitals" as Href;
  return null;
}

export default function HomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const { patient, loading: patientLoading } = usePatient();
  const {
    profileName,
    profileAvatarUrl,
    activeCycle,
    hasBiopsy,
    lastDoc,
    latestSymptom,
    nextAppointment,
    refresh: refreshSummary,
    formatWidgetValue,
  } = useHomeSummary(patient);
  const { medications, refresh: refreshMeds } = useMedications();
  const { fetchInfusions } = useTreatmentCycles(patient);
  const scheduledActiveMeds = useMemo(
    () => medications.filter((m) => m.active && m.repeat_mode !== "as_needed"),
    [medications]
  );
  const nextMed = useMemo(() => nextMedicationSlot(scheduledActiveMeds), [scheduledActiveMeds]);
  const hasSosMedication = useMemo(
    () => medications.some((m) => m.active && m.repeat_mode === "as_needed"),
    [medications]
  );

  const [profileOpen, setProfileOpen] = useState(false);
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [infusions, setInfusions] = useState<TreatmentInfusionRow[]>([]);

  const firstName = useMemo(() => {
    const t = profileName.trim();
    if (!t) return "você";
    return t.split(/\s+/)[0] ?? t;
  }, [profileName]);

  const initials = useMemo(() => {
    const t = profileName.trim();
    if (!t) return "?";
    const p = t.split(/\s+/).filter(Boolean);
    if (p.length === 1) return p[0].slice(0, 1).toUpperCase();
    return `${p[0].slice(0, 1)}${p[p.length - 1].slice(0, 1)}`.toUpperCase();
  }, [profileName]);

  const { lastIso, next: nextInfusion } = useMemo(
    () => lastNextInfusion(infusions, activeCycle?.last_session_at ?? null),
    [infusions, activeCycle?.last_session_at]
  );

  const loadInfusions = useCallback(async () => {
    if (!activeCycle?.id) {
      setInfusions([]);
      return;
    }
    const rows = await fetchInfusions(activeCycle.id);
    setInfusions(rows);
  }, [activeCycle?.id, fetchInfusions]);

  useEffect(() => {
    void loadInfusions();
  }, [loadInfusions]);

  useEffect(() => {
    void (async () => {
      const ids = await loadPinnedWidgetIds();
      setPinnedIds(ids);
      const a = await appStorage.getItem(AVATAR_STORAGE_KEY);
      if (a) setAvatarUri(a);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSummary();
      void refreshMeds();
      void loadInfusions();
    }, [refreshSummary, refreshMeds, loadInfusions])
  );

  const openTreatmentCycle = useCallback(() => {
    if (activeCycle?.id) {
      router.push(`/(tabs)/treatment/${activeCycle.id}` as Href);
    } else {
      router.push("/(tabs)/treatment" as Href);
    }
  }, [activeCycle?.id, router]);

  async function persistPinned(ids: string[]) {
    setPinnedIds(ids);
    await savePinnedWidgetIds(ids);
  }

  async function markMedicationTaken() {
    if (!patient || !nextMed) return;
    const { med, when } = nextMed;
    const { error } = await supabase.from("medication_logs").insert({
      patient_id: patient.id,
      medication_id: med.id,
      scheduled_time: when.toISOString(),
      taken_time: new Date().toISOString(),
      status: "taken",
    });
    if (error) {
      Alert.alert("Medicamento", error.message);
      return;
    }
    await refreshMeds();
    await refreshSummary();
  }

  const ringSize = 118;
  const track = theme.colors.background.tertiary;

  return (
    <ResponsiveScreen variant="tabGradient">
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: theme.spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.6 }]}>
              {greetingLabel()},
            </Text>
            <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>{firstName}</Text>
          </View>
          <Pressable
            onPress={() => setProfileOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil e configurações"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              overflow: "hidden",
              backgroundColor: theme.colors.semantic.symptoms,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {profileAvatarUrl || avatarUri ? (
              <Image
                source={{ uri: profileAvatarUrl ?? avatarUri ?? "" }}
                style={{ width: 48, height: 48 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF" }}>{initials}</Text>
            )}
          </Pressable>
        </View>

        <View style={{ paddingVertical: theme.spacing.md }}>
          {!patientLoading && !patient && (
            <OncoCard>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Complete seu prontuário</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Precisamos de contexto clínico mínimo para alertas e o seu resumo.
              </Text>
              <Link href="/onboarding" asChild>
                <Pressable
                  style={{
                    marginTop: theme.spacing.lg,
                    backgroundColor: theme.colors.semantic.treatment,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    alignItems: "center",
                  }}
                >
                  <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Começar cadastro</Text>
                </Pressable>
              </Link>
            </OncoCard>
          )}

          {patient && activeCycle ? (
            <Pressable
              onPress={openTreatmentCycle}
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
                    <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.xs }]} numberOfLines={2}>
                      {activeCycle.protocol_name}
                    </Text>
                    {activeCycle.planned_sessions != null ? (
                      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
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
                      size={ringSize}
                      trackColor={track}
                      ring={{
                        radius: 46,
                        strokeWidth: 9,
                        progress: sessionRingProgress(activeCycle),
                        color: theme.colors.semantic.vitals,
                      }}
                    />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, marginTop: 4 }}>Dia {cycleDayNumber(activeCycle.start_date)}</Text>
                  </View>
                </View>
              </OncoCard>
            </Pressable>
          ) : patient ? (
            <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Tratamento</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Nenhum ciclo ativo. Quando existir, o resumo do ciclo e as infusões aparecem aqui.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/treatment" as Href)}
                style={{
                  marginTop: theme.spacing.md,
                  backgroundColor: theme.colors.semantic.treatment,
                  paddingVertical: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  alignItems: "center",
                }}
              >
                <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Abrir tratamento</Text>
              </Pressable>
            </OncoCard>
          ) : null}

          {patient ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.sm }}>
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Métricas em foco</Text>
                <Pressable onPress={() => setWidgetPickerOpen(true)}>
                  <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700" }}>Ajustar</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
                {pinnedIds.map((id) => {
                  const fmt = formatWidgetValue(id);
                  const label = getWidgetLabel(id);
                  const target = hrefForPinnedWidget(id);
                  const inner = (
                    <View
                      style={{
                        width: "100%",
                        backgroundColor: theme.colors.background.primary,
                        borderRadius: theme.radius.md,
                        padding: theme.spacing.md,
                        minHeight: 96,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.text.secondary, letterSpacing: 0.6 }}>
                        {label.toUpperCase()}
                      </Text>
                      <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: 6 }]} numberOfLines={2}>
                        {fmt.subtitle}
                      </Text>
                      {fmt.hint ? (
                        <Text style={{ fontSize: 11, color: theme.colors.text.tertiary, marginTop: 4 }} numberOfLines={2}>
                          {fmt.hint}
                        </Text>
                      ) : null}
                      {target ? (
                        <Text style={{ fontSize: 11, color: theme.colors.semantic.respiratory, marginTop: 6, fontWeight: "600" }}>
                          Toque para registar
                        </Text>
                      ) : null}
                    </View>
                  );
                  return target ? (
                    <Pressable key={id} onPress={() => router.push(target)} style={{ width: "47%" }}>
                      {inner}
                    </Pressable>
                  ) : (
                    <View key={id} style={{ width: "47%" }}>
                      {inner}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {patient ? (
            <Pressable onPress={() => router.push("/(tabs)/health/nutrition" as Href)} style={{ marginTop: theme.spacing.lg }}>
              <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Nutrição e hábitos</Text>
                  <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                  Registe água, café, refeições, calorias e apetite. Os resumos também aparecem em Métricas em foco.
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.semantic.respiratory, marginTop: theme.spacing.sm }}>Abrir nutrição</Text>
              </OncoCard>
            </Pressable>
          ) : null}

          {patient && hasBiopsy ? (
            <OncoCard style={{ marginTop: theme.spacing.md, backgroundColor: theme.colors.background.primary }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Perfil do tumor</Text>
                <Link href="/(tabs)/exams" asChild>
                  <Pressable>
                    <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700", fontSize: 13 }}>VER DETALHES</Text>
                  </Pressable>
                </Link>
              </View>
              <View style={{ flexDirection: "row", marginTop: theme.spacing.md, gap: theme.spacing.md }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: theme.radius.sm,
                    backgroundColor: theme.colors.semantic.treatment,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome name="medkit" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{labelCancerType(patient.primary_cancer_type)}</Text>
                  {patient.current_stage ? (
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>Estágio {patient.current_stage}</Text>
                  ) : (
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>Detalhes no anatomopatológico</Text>
                  )}
                </View>
              </View>
            </OncoCard>
          ) : null}

          {patient ? (
            <OncoCard style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.background.primary }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Próximas doses</Text>
                <Link href="/(tabs)/health/medications" asChild>
                  <Pressable>
                    <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700", fontSize: 13 }}>GERIR</Text>
                  </Pressable>
                </Link>
              </View>
              {nextMed ? (
                <View style={{ marginTop: theme.spacing.md }}>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{nextMed.med.name}</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                    {nextMed.med.dosage ? `${nextMed.med.dosage} · ` : ""}
                    Próxima dose: {nextMed.when.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </Text>
                  <Pressable
                    onPress={markMedicationTaken}
                    style={{
                      marginTop: theme.spacing.md,
                      backgroundColor: theme.colors.semantic.nutrition,
                      paddingVertical: theme.spacing.md,
                      borderRadius: theme.radius.md,
                      alignItems: "center",
                    }}
                  >
                    <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Marcar como tomado</Text>
                  </Pressable>
                </View>
              ) : hasSosMedication ? (
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                  Medicamentos SOS não têm horário fixo. Abra Medicamentos e use &quot;Registar dose&quot; no item para marcar como tomado.
                </Text>
              ) : (
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                  Adicione medicamentos com horário em Saúde → Medicamentos.
                </Text>
              )}
              <Link href="/(tabs)/health/medications" asChild>
                <Pressable
                  style={{
                    marginTop: theme.spacing.md,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.md,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.background.secondary,
                  }}
                >
                  <FontAwesome name="medkit" size={24} color={theme.colors.semantic.respiratory} />
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Medicamentos</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2 }]}>Adicionar ou editar</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color={theme.colors.text.tertiary} />
                </Pressable>
              </Link>
            </OncoCard>
          ) : null}

          {patient ? (
            <Link href="/calendar" asChild>
              <Pressable style={{ marginTop: theme.spacing.lg }}>
                <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>
                      {nextAppointment?.kind === "exam" ? "Próximo exame" : "Agendamento"}
                    </Text>
                    <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700", fontSize: 13 }}>CALENDÁRIO</Text>
                  </View>
                  {nextAppointment ? (
                    <View style={{ marginTop: theme.spacing.md }}>
                      <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                        {nextAppointment.title}
                      </Text>
                      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                        {nextAppointment.kind === "exam"
                          ? "Exame"
                          : nextAppointment.kind === "consult"
                            ? "Consulta"
                            : "Outro"}{" "}
                        · {formatSessionAt(nextAppointment.starts_at)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                      Nenhum exame ou consulta futura no calendário. Toque para adicionar lembretes.
                    </Text>
                  )}
                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.semantic.treatment, marginTop: theme.spacing.md }}>
                    {nextAppointment ? "Ver calendário e lembretes" : "Abrir calendário"}
                  </Text>
                </OncoCard>
              </Pressable>
            </Link>
          ) : null}

          {patient ? (
            <View style={{ marginTop: theme.spacing.md, flexDirection: "row", gap: theme.spacing.sm }}>
              <Link href="/calendar" asChild>
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.md,
                    alignItems: "center",
                  }}
                >
                  <FontAwesome name="calendar" size={22} color={theme.colors.semantic.treatment} />
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: 6 }]}>Calendário</Text>
                </Pressable>
              </Link>
              <Link href="/reports" asChild>
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.background.primary,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.md,
                    alignItems: "center",
                  }}
                >
                  <FontAwesome name="file-pdf-o" size={22} color={theme.colors.semantic.nutrition} />
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: 6 }]}>Relatórios</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}

          {patient ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Atividade recente</Text>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Link href="/(tabs)/diary" asChild>
                  <Pressable
                    style={{
                      flex: 1,
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: theme.radius.md,
                      padding: theme.spacing.md,
                      minHeight: 110,
                    }}
                  >
                    <FontAwesome name="heart" size={20} color={theme.colors.semantic.symptoms} />
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>Sintomas</Text>
                    <Text style={{ color: theme.colors.semantic.symptoms, marginTop: 4 }} numberOfLines={2}>
                      {latestSymptom
                        ? latestSymptom.entry_kind === "prd"
                          ? `D/N/F ${latestSymptom.pain_level}/${latestSymptom.nausea_level}/${latestSymptom.fatigue_level}`
                          : labelSymptomCategory(latestSymptom.symptom_category ?? "")
                        : "Nenhum registro"}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 6 }}>
                      {latestSymptom ? formatDayMonth(latestSymptom.logged_at) : "—"}
                    </Text>
                  </Pressable>
                </Link>
                <Link href="/(tabs)/exams" asChild>
                  <Pressable
                    style={{
                      flex: 1,
                      backgroundColor: theme.colors.background.primary,
                      borderRadius: theme.radius.md,
                      padding: theme.spacing.md,
                      minHeight: 110,
                    }}
                  >
                    <FontAwesome name="file-text-o" size={20} color={theme.colors.semantic.respiratory} />
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>Exames</Text>
                    <Text style={{ color: theme.colors.text.primary, marginTop: 4 }} numberOfLines={2}>
                      {lastDoc ? documentTypeLabel[lastDoc.document_type] ?? lastDoc.document_type : "Nenhum arquivo"}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 6 }}>
                      {lastDoc ? formatDayMonth(lastDoc.uploaded_at) : "—"}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <ProfileSheet
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        profileName={profileName}
        localAvatarUri={avatarUri}
        remoteAvatarUrl={profileAvatarUrl}
        onSignOut={() => void signOut()}
        onProfileSaved={() => {
          void refreshSummary();
        }}
      />

      <WidgetPickerModal
        visible={widgetPickerOpen}
        onClose={() => setWidgetPickerOpen(false)}
        selectedIds={pinnedIds}
        onSave={(ids) => {
          void persistPinned(ids);
          void refreshSummary();
        }}
      />

      <OnboardingWalkthrough />
    </ResponsiveScreen>
  );
}
