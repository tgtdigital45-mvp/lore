import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import type { CategoryShortcutId } from "@/src/home/pinnedCategoryShortcuts";
import { categoryShortcutDef, loadPinnedCategoryIds } from "@/src/home/pinnedCategoryShortcuts";
import type { Href } from "expo-router";
import { Link, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { appStorage } from "@/src/lib/appStorage";
import { OnboardingWalkthrough } from "@/src/components/OnboardingWalkthrough";
import { OncoCard } from "@/components/OncoCard";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { ProfileSheet } from "@/src/home/ProfileSheet";
import { AVATAR_STORAGE_KEY, getWidgetLabel, loadPinnedWidgetIds, savePinnedWidgetIds } from "@/src/home/resumoWidgets";
import { ActiveTreatmentCycleCard } from "@/src/home/ActiveTreatmentCycleCard";
import { HomeSummarySkeleton } from "@/src/home/HomeSummarySkeleton";
import { useHomeSummary } from "@/src/home/useHomeSummary";
import { WidgetPickerModal } from "@/src/home/WidgetPickerModal";
import { DoseMarkButton } from "@/src/home/DoseMarkButton";
import { HomeDoseSlotActions } from "@/src/home/HomeDoseSlotActions";
import { ResumoHomeActivitySection } from "@/src/home/ResumoHomeActivitySection";
import { ResumoHomeGreeting } from "@/src/home/ResumoHomeGreeting";
import {
  appointmentKindIcon,
  appointmentKindShortLabel,
  hrefForPinnedWidget,
  medicationSlotKey,
  sosMarkSlotKey,
} from "@/src/home/homeScreenHelpers";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import {
  useAdaptiveSymptomReminders,
  useFeverWatchReminders,
  usePatientInfusions,
} from "@/src/hooks/useAdaptiveReminders";
import { useMedications, type MedicationRow } from "@/src/hooks/useMedications";
import { usePatientConsentNotifications } from "@/src/hooks/usePatientConsentNotifications";
import { usePatient } from "@/src/hooks/usePatient";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { reconcileMissedDoseSlots } from "@/src/lib/medicationMissedReconciliation";
import { computeNextDose, nextMedicationSlot } from "@/src/lib/medicationNotifications";
import { recordDoseSkipped, recordDoseTaken } from "@/src/lib/medicationLogWrite";
import { relativeSchedulePhrasePtBr } from "@/src/lib/ptBrRelativeDate";
import { showAppToast } from "@/src/lib/appToast";
import type { TreatmentInfusionRow } from "@/src/types/treatment";

export default function HomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const { patient, loading: patientLoading } = usePatient();
  const {
    profileName,
    profileAvatarUrl,
    activeCycle,
    lastDoc,
    latestSymptom,
    nextAppointment,
    refresh: refreshSummary,
    formatWidgetValue,
    loading: summaryLoading,
    isFetching: summaryFetching,
    isError: summaryQueryError,
    error: summaryQueryErrorDetail,
  } = useHomeSummary(patient);
  const { medications, refresh: refreshMeds } = useMedications();
  const { fetchInfusions } = useTreatmentCycles(patient);
  const allPatientInfusions = usePatientInfusions(patient?.id);
  const { data: consentNotifs } = usePatientConsentNotifications();
  useAdaptiveSymptomReminders({
    enabled: Boolean(patient),
    notifySymptoms: consentNotifs?.notify_symptoms ?? true,
    infusions: allPatientInfusions,
  });
  useFeverWatchReminders({
    enabled: Boolean(patient) && (consentNotifs?.notify_symptoms ?? true),
    patientId: patient?.id,
  });
  const scheduledActiveMeds = useMemo(
    () => medications.filter((m) => m.active && m.repeat_mode !== "as_needed"),
    [medications]
  );
  const nextMed = useMemo(() => nextMedicationSlot(scheduledActiveMeds), [scheduledActiveMeds]);
  const nextDoseSlotKey = useMemo(
    () => (nextMed ? `${nextMed.med.id}|${nextMed.when.toISOString()}` : null),
    [nextMed]
  );
  const hasSosMedication = useMemo(
    () => medications.some((m) => m.active && m.repeat_mode === "as_needed"),
    [medications]
  );

  const pinnedMedications = useMemo(
    () => medications.filter((m) => m.active && m.pinned),
    [medications]
  );

  const pinnedResumoRows = useMemo(() => {
    const nextId = nextMed?.med.id;
    return pinnedMedications
      .filter((m) => m.id !== nextId)
      .map((med) => ({ med, when: computeNextDose(med, Date.now()) }));
  }, [pinnedMedications, nextMed?.med.id]);

  const [profileOpen, setProfileOpen] = useState(false);
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarEpoch, setAvatarEpoch] = useState(0);
  const [infusions, setInfusions] = useState<TreatmentInfusionRow[]>([]);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [pinnedCategoryIds, setPinnedCategoryIds] = useState<CategoryShortcutId[]>([]);
  const [markingDoseSlotKey, setMarkingDoseSlotKey] = useState<string | null>(null);
  const [confirmedDoseSlotKeys, setConfirmedDoseSlotKeys] = useState<string[]>([]);
  const [skippedDoseSlotKeys, setSkippedDoseSlotKeys] = useState<string[]>([]);

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
      const cats = await loadPinnedCategoryIds();
      setPinnedCategoryIds(cats);
      const a = await appStorage.getItem(AVATAR_STORAGE_KEY);
      if (a) setAvatarUri(a);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPinnedCategoryIds().then(setPinnedCategoryIds);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      void refreshMeds();
    }, [refreshMeds])
  );

  useFocusEffect(
    useCallback(() => {
      if (!patient?.id || medications.length === 0) return;
      void reconcileMissedDoseSlots(medications);
    }, [patient?.id, medications])
  );

  const lastFetchRef = useRef(0);
  const markingDoseTakenRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchRef.current < 15000) return; // Skip if less than 15s
      lastFetchRef.current = now;

      void (async () => {
        try {
          await Promise.all([refreshSummary(), refreshMeds(), loadInfusions()]);
        } catch (e) {
          showAppToast("error", "Resumo", e instanceof Error ? e.message : "Não foi possível atualizar ao voltar ao ecrã.");
        }
      })();
    }, [refreshSummary, refreshMeds, loadInfusions])
  );

  const onPullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await Promise.all([refreshSummary(), refreshMeds(), loadInfusions()]);
    } catch (e) {
      showAppToast("error", "Resumo", e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setPullRefreshing(false);
    }
  }, [refreshSummary, refreshMeds, loadInfusions]);

  const openTreatmentCycle = useCallback(() => {
    if (activeCycle?.id) {
      router.push(`/(tabs)/health/treatment/${activeCycle.id}` as Href);
    } else {
      router.push("/(tabs)/health/treatment" as Href);
    }
  }, [activeCycle?.id, router]);

  async function persistPinned(ids: string[]) {
    setPinnedIds(ids);
    await savePinnedWidgetIds(ids);
  }

  const markDoseTaken = useCallback(
    async (med: MedicationRow, when: Date, takenTimeIso?: string) => {
      if (!patient || markingDoseTakenRef.current) return;
      const slotKeyForInsert = medicationSlotKey(med.id, when);
      markingDoseTakenRef.current = true;
      setMarkingDoseSlotKey(slotKeyForInsert);
      try {
        const { error } = await recordDoseTaken({
          patientId: patient.id,
          medicationId: med.id,
          scheduledTimeIso: when.toISOString(),
          takenTimeIso: takenTimeIso ?? new Date().toISOString(),
        });
        if (error) {
          showAppToast("error", "Medicamento", error.message);
          return;
        }
        setConfirmedDoseSlotKeys((prev) => (prev.includes(slotKeyForInsert) ? prev : [...prev, slotKeyForInsert]));
        setSkippedDoseSlotKeys((prev) => prev.filter((k) => k !== slotKeyForInsert));
        showAppToast("success", "Medicamento", "Dose registada.");
        await refreshMeds();
        await refreshSummary();
      } finally {
        markingDoseTakenRef.current = false;
        setMarkingDoseSlotKey(null);
      }
    },
    [patient, refreshMeds, refreshSummary]
  );

  const markDoseSkipped = useCallback(
    async (med: MedicationRow, when: Date) => {
      if (!patient || markingDoseTakenRef.current) return;
      const slotKeyForInsert = medicationSlotKey(med.id, when);
      markingDoseTakenRef.current = true;
      setMarkingDoseSlotKey(slotKeyForInsert);
      try {
        const { error } = await recordDoseSkipped({
          patientId: patient.id,
          medicationId: med.id,
          scheduledTimeIso: when.toISOString(),
        });
        if (error) {
          showAppToast("error", "Medicamento", error.message);
          return;
        }
        setSkippedDoseSlotKeys((prev) => (prev.includes(slotKeyForInsert) ? prev : [...prev, slotKeyForInsert]));
        setConfirmedDoseSlotKeys((prev) => prev.filter((k) => k !== slotKeyForInsert));
        showAppToast("success", "Medicamento", "Registado como não tomado.");
        await refreshMeds();
        await refreshSummary();
      } finally {
        markingDoseTakenRef.current = false;
        setMarkingDoseSlotKey(null);
      }
    },
    [patient, refreshMeds, refreshSummary]
  );

  const markSosDoseTaken = useCallback(
    async (med: MedicationRow) => {
      if (!patient || markingDoseTakenRef.current) return;
      const pendingKey = sosMarkSlotKey(med.id);
      markingDoseTakenRef.current = true;
      setMarkingDoseSlotKey(pendingKey);
      try {
        const now = new Date();
        const iso = now.toISOString();
        const { error } = await recordDoseTaken({
          patientId: patient.id,
          medicationId: med.id,
          scheduledTimeIso: iso,
          takenTimeIso: iso,
        });
        if (error) {
          showAppToast("error", "Medicamento", error.message);
          return;
        }
        showAppToast("success", "Medicamento", "Toma SOS registada neste momento.");
        await refreshMeds();
        await refreshSummary();
      } finally {
        markingDoseTakenRef.current = false;
        setMarkingDoseSlotKey(null);
      }
    },
    [patient, refreshMeds, refreshSummary]
  );

  return (
    <ResponsiveScreen variant="tabGradient">
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl+80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => {
              void onPullRefresh();
            }}
            tintColor={theme.colors.semantic.treatment}
          />
        }
      >
        {patient && summaryQueryError ? (
          <OncoCard style={{ marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.semantic.symptoms }}>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Resumo indisponível</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
              {summaryQueryErrorDetail?.message ?? "Erro ao carregar dados do resumo."}
            </Text>
            <Pressable
              onPress={() => {
                void refreshSummary();
              }}
              style={{
                marginTop: theme.spacing.md,
                alignSelf: "flex-start",
                backgroundColor: theme.colors.semantic.treatment,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.md,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Tentar novamente</Text>
            </Pressable>
          </OncoCard>
        ) : null}
        {patient && summaryLoading && !summaryQueryError ? <HomeSummarySkeleton theme={theme} /> : null}
        {patient && summaryFetching && !summaryLoading && !summaryQueryError ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <ActivityIndicator size="small" color={theme.colors.semantic.treatment} />
            <Text style={[theme.typography.caption1, { color: theme.colors.text.secondary }]}>A atualizar o resumo…</Text>
          </View>
        ) : null}
        <ResumoHomeGreeting
          theme={theme}
          firstName={firstName}
          initials={initials}
          profileAvatarUrl={profileAvatarUrl}
          patientAvatarUrl={patient?.profiles?.avatar_url}
          localAvatarUri={avatarUri}
          avatarEpoch={avatarEpoch}
          onOpenProfile={() => setProfileOpen(true)}
        />

        {patient && pinnedCategoryIds.length > 0 ? (
          <View style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xs }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: theme.colors.text.secondary,
                letterSpacing: 0.4,
                marginBottom: theme.spacing.sm,
              }}
            >
              Atalhos fixados
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: "row", gap: theme.spacing.sm, paddingRight: theme.spacing.md }}
            >
              {pinnedCategoryIds.map((id) => {
                const def = categoryShortcutDef(id);
                if (!def) return null;
                return (
                  <Pressable
                    key={id}
                    onPress={() => router.push(def.href)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.background.primary,
                      borderWidth: 1,
                      borderColor: theme.colors.border.divider,
                      opacity: pressed ? 0.88 : 1,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    })}
                  >
                    <FontAwesome name={def.icon} size={16} color={theme.colors.semantic.treatment} />
                    <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.text.primary }}>{def.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

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
            <ActiveTreatmentCycleCard
              theme={theme}
              activeCycle={activeCycle}
              infusions={infusions}
              onPress={openTreatmentCycle}
              hideProtocolName={false}
            />
          ) : null}

          {patient ? (
            <View style={{ marginTop: activeCycle ? theme.spacing.lg : theme.spacing.md }}>
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
                          Toque para registrar
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
            <OncoCard
              style={{
                marginTop: theme.spacing.lg,
                backgroundColor: theme.colors.background.primary,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flex: 1 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: theme.radius.sm,
                      backgroundColor: theme.colors.semantic.nutrition,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome name="medkit" size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Próximas doses</Text>
                    <Text style={[theme.typography.caption1, { color: theme.colors.text.tertiary, marginTop: 2 }]}>
                      {scheduledActiveMeds.length > 0
                        ? "Horário mais próximo e medicamentos fixados; Tomado (com hora) ou Não tomado por janela"
                        : hasSosMedication || pinnedResumoRows.length > 0
                          ? "SOS e fixados abaixo; com horário, aparece a janela seguinte"
                          : "Adicione medicamentos em Saúde → Medicamentos"}
                    </Text>
                  </View>
                </View>
                <Link href="/(tabs)/health/medications" asChild>
                  <Pressable>
                    <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700", fontSize: 13 }}>GERIR</Text>
                  </Pressable>
                </Link>
              </View>

              {nextMed ? (
                <View style={{ marginTop: theme.spacing.md }}>
                  <Text style={[theme.typography.caption1, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.xs, letterSpacing: 0.3 }]}>
                    Próxima janela (mais cedo)
                  </Text>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{nextMed.med.display_name?.trim() || nextMed.med.name}</Text>
                  {nextMed.med.dosage ? (
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>{nextMed.med.dosage}</Text>
                  ) : null}
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                    {relativeSchedulePhrasePtBr(nextMed.when.toISOString())}
                  </Text>
                  {nextDoseSlotKey ? (
                    <HomeDoseSlotActions
                      theme={theme}
                      slotKey={nextDoseSlotKey}
                      scheduledWhen={nextMed.when}
                      markingSlotKey={markingDoseSlotKey}
                      doseTaken={confirmedDoseSlotKeys.includes(nextDoseSlotKey)}
                      doseSkipped={skippedDoseSlotKeys.includes(nextDoseSlotKey)}
                      onConfirmTaken={(iso) => markDoseTaken(nextMed.med, nextMed.when, iso)}
                      onConfirmSkipped={() => markDoseSkipped(nextMed.med, nextMed.when)}
                    />
                  ) : null}
                </View>
              ) : null}

              {pinnedResumoRows.length > 0 ? (
                <View style={nextMed ? { marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border.divider } : { marginTop: theme.spacing.md }}>
                  <Text style={[theme.typography.caption1, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.sm, letterSpacing: 0.3 }]}>
                    Medicamentos fixados
                  </Text>
                  {pinnedResumoRows.map(({ med, when }, idx) => {
                    const label = med.display_name?.trim() || med.name;
                    return (
                      <View
                        key={med.id}
                        style={
                          idx > 0
                            ? {
                                marginTop: theme.spacing.lg,
                                paddingTop: theme.spacing.lg,
                                borderTopWidth: 1,
                                borderTopColor: theme.colors.border.divider,
                              }
                            : undefined
                        }
                      >
                        <Pressable
                          onPress={() => router.push(`/(tabs)/health/medications/detail?id=${med.id}` as Href)}
                          accessibilityRole="button"
                          accessibilityLabel={`Abrir ${label}`}
                        >
                          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                            {label}
                          </Text>
                          {med.dosage ? (
                            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>{med.dosage}</Text>
                          ) : null}
                        </Pressable>
                        {when ? (
                          <>
                            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                              {relativeSchedulePhrasePtBr(when.toISOString())}
                            </Text>
                            <HomeDoseSlotActions
                              theme={theme}
                              slotKey={medicationSlotKey(med.id, when)}
                              scheduledWhen={when}
                              markingSlotKey={markingDoseSlotKey}
                              doseTaken={confirmedDoseSlotKeys.includes(medicationSlotKey(med.id, when))}
                              doseSkipped={skippedDoseSlotKeys.includes(medicationSlotKey(med.id, when))}
                              onConfirmTaken={(iso) => markDoseTaken(med, when, iso)}
                              onConfirmSkipped={() => markDoseSkipped(med, when)}
                            />
                          </>
                        ) : med.repeat_mode === "as_needed" ? (
                          <>
                            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                              Uso SOS — sem horário agendado. Ao tocar, regista a hora em que tomou.
                            </Text>
                            <DoseMarkButton
                              theme={theme}
                              slotKey={sosMarkSlotKey(med.id)}
                              markingSlotKey={markingDoseSlotKey}
                              confirmedSlotKeys={confirmedDoseSlotKeys}
                              repeatDose
                              onPress={() => {
                                void markSosDoseTaken(med);
                              }}
                            />
                          </>
                        ) : (
                          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                            Sem próxima dose calculada neste momento. Verifique o agendamento em Medicamentos.
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {!nextMed && pinnedResumoRows.length === 0 ? (
                hasSosMedication ? (
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                    Ainda sem horário agendado neste resumo. Para medicamentos SOS, fixe-os em Medicamentos e registe a toma abaixo quando aparecerem.
                  </Text>
                ) : (
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                    Adicione medicamentos com horário em Saúde → Medicamentos.
                  </Text>
                )
              ) : null}

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
                  <FontAwesome name="plus-circle" size={22} color={theme.colors.semantic.respiratory} />
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Medicamentos</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2 }]}>Adicionar ou editar</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color={theme.colors.text.tertiary} />
                </Pressable>
              </Link>
            </OncoCard>
          ) : null}

          {patient && nextAppointment ? (
            <OncoCard
              style={{
                marginTop: theme.spacing.lg,
                backgroundColor: theme.colors.background.primary,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flex: 1 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: theme.radius.sm,
                      backgroundColor: theme.colors.semantic.respiratory,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome name={appointmentKindIcon(nextAppointment.kind)} size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Próximo agendamento</Text>
                    <Text style={[theme.typography.caption1, { color: theme.colors.text.tertiary, marginTop: 2 }]}>
                      {appointmentKindShortLabel(nextAppointment.kind)} · fixado na agenda
                    </Text>
                  </View>
                </View>
                <Link href="/calendar" asChild>
                  <Pressable>
                    <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700", fontSize: 13 }}>CALENDÁRIO</Text>
                  </Pressable>
                </Link>
              </View>
              <View style={{ marginTop: theme.spacing.md }}>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
                  {nextAppointment.title}
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
                  {relativeSchedulePhrasePtBr(nextAppointment.starts_at)}
                </Text>
              </View>
              <Link href="/calendar" asChild>
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
                  <FontAwesome name="calendar" size={22} color={theme.colors.semantic.respiratory} />
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Ver agenda</Text>
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2 }]}>Todos os agendamentos e lembretes</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color={theme.colors.text.tertiary} />
                </Pressable>
              </Link>
            </OncoCard>
          ) : null}

          {patient ? (
            <Pressable onPress={() => router.push("/(tabs)/health/nutrition" as Href)} style={{ marginTop: theme.spacing.lg }}>
              <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Nutrição e hábitos</Text>
                  <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                  Registre água, café, refeições, calorias e apetite. Os resumos também aparecem em Métricas em foco.
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.semantic.respiratory, marginTop: theme.spacing.sm }}>Abrir nutrição</Text>
              </OncoCard>
            </Pressable>
          ) : null}

          {patient ? (
            <Pressable onPress={() => router.push("/(tabs)/health/education" as Href)} style={{ marginTop: theme.spacing.md }}>
              <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Biblioteca de apoio</Text>
                  <FontAwesome name="chevron-right" size={14} color={theme.colors.text.tertiary} />
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                  Artigos alinhados aos seus sintomas e tipo de tumor.
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.semantic.respiratory, marginTop: theme.spacing.sm }}>Abrir</Text>
              </OncoCard>
            </Pressable>
          ) : null}

          {patient ? (
            <Pressable onPress={() => router.push("/reports" as Href)} style={{ marginTop: theme.spacing.lg }}>
              <OncoCard style={{ backgroundColor: theme.colors.background.primary, ...IOS_HEALTH.shadow.card }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flex: 1 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: theme.radius.sm,
                        backgroundColor: theme.colors.semantic.nutrition,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FontAwesome name="file-pdf-o" size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Relatórios</Text>
                      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                        PDFs e documentos partilháveis com a equipa
                      </Text>
                    </View>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color={theme.colors.text.tertiary} />
                </View>
              </OncoCard>
            </Pressable>
          ) : null}

          {patient ? (
            <ResumoHomeActivitySection theme={theme} latestSymptom={latestSymptom} lastDoc={lastDoc} />
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
        onProfileSaved={async () => {
          setAvatarEpoch((n) => n + 1);
          await refreshSummary();
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
