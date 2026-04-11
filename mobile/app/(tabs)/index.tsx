import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, Dimensions, Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import * as ImagePicker from "expo-image-picker";
import { Link } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { appStorage } from "@/src/lib/appStorage";
import { afterModalCloseThen, alertPermissionToSettings } from "@/src/lib/nativePickerTiming";
import { OncoCard } from "@/components/OncoCard";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { ProfileSheet } from "@/src/home/ProfileSheet";
import { AVATAR_STORAGE_KEY, getWidgetLabel, loadPinnedWidgetIds, savePinnedWidgetIds } from "@/src/home/resumoWidgets";
import { useHomeSummary } from "@/src/home/useHomeSummary";
import { WidgetPickerModal } from "@/src/home/WidgetPickerModal";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { documentTypeLabel, labelCancerType, labelSymptomCategory } from "@/src/i18n/ui";
import { canonicalBiomarkerName, parseLabNumericString } from "@/src/exams/biomarkerCanonical";
import { supabase } from "@/src/lib/supabase";

type BioRow = {
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  logged_at: string;
};

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

function cycleDayNumber(startDate: string): number {
  const s = new Date(startDate.includes("T") ? startDate : `${startDate}T12:00:00`);
  const diff = Math.floor((Date.now() - s.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

function cycleProgressPct(startDate: string, endDate: string | null): number {
  if (endDate) {
    const s = new Date(startDate.includes("T") ? startDate : `${startDate}T12:00:00`).getTime();
    const e = new Date(endDate.includes("T") ? endDate : `${endDate}T12:00:00`).getTime();
    const t = Date.now();
    if (e <= s) return 1;
    return Math.min(1, Math.max(0, (t - s) / (e - s)));
  }
  return Math.min(1, cycleDayNumber(startDate) / 21);
}

export default function HomeScreen() {
  const { theme } = useAppTheme();
  const { signOut } = useAuth();
  const { patient, loading: patientLoading } = usePatient();
  const {
    profileName,
    activeCycle,
    hasBiopsy,
    lastDoc,
    latestSymptom,
    formatWidgetValue,
    refresh: refreshSummary,
  } = useHomeSummary(patient);

  const [bioSeries, setBioSeries] = useState<{ name: string; data: { value: number; label: string }[] }[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const chartWidth = useMemo(() => Math.min(Dimensions.get("window").width - theme.spacing.md * 4, 400), [theme.spacing.md]);

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

  useEffect(() => {
    void (async () => {
      const ids = await loadPinnedWidgetIds();
      setPinnedIds(ids);
      const a = await appStorage.getItem(AVATAR_STORAGE_KEY);
      if (a) setAvatarUri(a);
    })();
  }, []);

  const loadBioSeries = useCallback(async () => {
    if (!patient) {
      setBioSeries([]);
      return;
    }
    const { data, error } = await supabase
      .from("biomarker_logs")
      .select("name, value_numeric, value_text, logged_at")
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: true });
    if (error || !data) {
      setBioSeries([]);
      return;
    }
    const byName = new Map<string, BioRow[]>();
    for (const r of data as BioRow[]) {
      const key = canonicalBiomarkerName(r.name);
      const list = byName.get(key) ?? [];
      list.push(r);
      byName.set(key, list);
    }
    const out: { name: string; data: { value: number; label: string }[] }[] = [];
    for (const [name, rows] of byName) {
      const pts = rows
        .map((r) => {
          let v: number | null = r.value_numeric != null ? Number(r.value_numeric) : null;
          if (v == null || !Number.isFinite(v)) {
            v = parseLabNumericString(String(r.value_text ?? ""));
          }
          if (v == null || !Number.isFinite(v)) return null;
          const d = new Date(r.logged_at);
          const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
          return { value: v, label };
        })
        .filter((x): x is { value: number; label: string } => x !== null);
      if (pts.length === 0) continue;
      const chartPts =
        pts.length === 1
          ? [
              pts[0],
              { ...pts[0], label: pts[0].label },
            ]
          : pts;
      out.push({ name, data: chartPts });
    }
    setBioSeries(out.slice(0, 8));
  }, [patient]);

  useEffect(() => {
    void loadBioSeries();
  }, [loadBioSeries]);

  useFocusEffect(
    useCallback(() => {
      void refreshSummary();
      void loadBioSeries();
    }, [refreshSummary, loadBioSeries])
  );

  const openAvatarPicker = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const limited =
        Platform.OS === "ios" &&
        "accessPrivileges" in perm &&
        (perm as { accessPrivileges?: string }).accessPrivileges === "limited";
      if (!perm.granted && !limited) {
        if (perm.canAskAgain === false) {
          alertPermissionToSettings(
            "Acesso à galeria",
            "Ative o acesso a Fotos nas definições do sistema para escolher uma imagem."
          );
        } else {
          Alert.alert("Permissão", "É necessário permitir o acesso à galeria para alterar a foto.");
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await appStorage.setItem(AVATAR_STORAGE_KEY, uri);
      setProfileOpen(true);
    } catch (e) {
      console.warn("[avatar]", e);
      Alert.alert(
        "Foto de perfil",
        e instanceof Error ? e.message : "Não foi possível abrir a galeria. Feche o painel e tente de novo."
      );
    }
  }, []);

  const onAvatarButtonPress = useCallback(() => {
    setProfileOpen(false);
    afterModalCloseThen(openAvatarPicker);
  }, [openAvatarPicker]);

  async function persistPinned(ids: string[]) {
    setPinnedIds(ids);
    await savePinnedWidgetIds(ids);
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
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
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 48, height: 48 }} resizeMode="cover" />
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
                Precisamos de contexto clínico mínimo para alertas e gráficos.
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
            <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.semantic.vitals }} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary, letterSpacing: 0.8 }}>
                      TRATAMENTO ATIVO
                    </Text>
                  </View>
                  <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.xs }]}>
                    {activeCycle.protocol_name}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "#FFD6E0",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#C41E5C" }}>Dia {cycleDayNumber(activeCycle.start_date)}</Text>
                </View>
              </View>
              <View style={{ marginTop: theme.spacing.md, height: 8, borderRadius: 4, backgroundColor: theme.colors.background.secondary, overflow: "hidden" }}>
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round(cycleProgressPct(activeCycle.start_date, activeCycle.end_date) * 100)}%`,
                    backgroundColor: theme.colors.semantic.vitals,
                  }}
                />
              </View>
            </OncoCard>
          ) : null}

          {patient && activeCycle ? (
            <OncoCard style={{ marginTop: theme.spacing.md, backgroundColor: theme.colors.background.primary }}>
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Roteiro da quimioterapia</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Protocolo <Text style={{ fontWeight: "600" }}>{activeCycle.protocol_name}</Text>
                {activeCycle.end_date
                  ? ` · previsão até ${activeCycle.end_date.split("T")[0]?.split("-").reverse().join("/") ?? ""}`
                  : " · duração em aberto (equipe pode atualizar o ciclo)"}
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Use o diário para sintomas e a aba Exames para acompanhar sangue e imagens — tudo ajuda o time a ajustar o próximo
                ciclo.
              </Text>
            </OncoCard>
          ) : patient ? (
            <OncoCard style={{ backgroundColor: theme.colors.background.primary }}>
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Tratamento</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Nenhum ciclo ativo cadastrado pelo hospital. Quando existir, o roteiro da quimioterapia aparece aqui.
              </Text>
            </OncoCard>
          ) : null}

          {patient ? (
            <OncoCard style={{ marginTop: theme.spacing.md, backgroundColor: theme.colors.background.primary }}>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Dados médicos</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Câncer: {labelCancerType(patient.primary_cancer_type)}
              </Text>
              {patient.current_stage ? (
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                  Estágio: {patient.current_stage}
                </Text>
              ) : null}
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                Nadir ativo: {patient.is_in_nadir ? "sim" : "não"}
              </Text>
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
                  return (
                    <View
                      key={id}
                      style={{
                        width: "47%",
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
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {patient ? (
            <OncoCard style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.background.primary }}>
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Nutrição e hábitos</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                Água e café em breve com registro rápido. Por enquanto use as métricas fixadas acima.
              </Text>
            </OncoCard>
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
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                    {labelCancerType(patient.primary_cancer_type)}
                  </Text>
                  {patient.current_stage ? (
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>Estágio {patient.current_stage}</Text>
                  ) : (
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>Detalhes no anatomopatológico</Text>
                  )}
                </View>
              </View>
            </OncoCard>
          ) : null}

          {patient && bioSeries.length > 0 ? (
            <OncoCard style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.background.primary }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Evolução gráfica</Text>
                <Link href="/(tabs)/exams" asChild>
                  <Pressable>
                    <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700", fontSize: 13 }}>HISTÓRICO</Text>
                  </Pressable>
                </Link>
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
                Valores extraídos dos exames (mesmo nome de métrica). Atualiza ao voltar ao Resumo; com dois ou mais pontos vê tendência.
              </Text>
              {bioSeries.map((s) => (
                <View key={s.name} style={{ marginTop: theme.spacing.lg }}>
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{s.name}</Text>
                  <LineChart
                    data={s.data}
                    width={chartWidth}
                    height={170}
                    color={theme.colors.semantic.treatment}
                    thickness={3}
                    startFillColor={theme.colors.semantic.treatment}
                    endFillColor={theme.colors.semantic.treatment}
                    startOpacity={0.35}
                    endOpacity={0.05}
                    spacing={Math.max(40, chartWidth / Math.max(s.data.length, 2))}
                    hideDataPoints={false}
                    yAxisColor={theme.colors.border.divider}
                    xAxisColor={theme.colors.border.divider}
                    yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                    curved
                    areaChart
                  />
                </View>
              ))}
            </OncoCard>
          ) : null}

          {patient ? (
            <OncoCard style={{ marginTop: theme.spacing.lg, backgroundColor: theme.colors.background.primary }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Próximas doses</Text>
                <Link href="/(tabs)/health/medications" asChild>
                  <Pressable>
                    <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "700", fontSize: 13 }}>VER TODOS</Text>
                  </Pressable>
                </Link>
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Configure lembretes e horários na área de medicamentos (integração com o fluxo de saúde do aparelho).
              </Text>
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
                    <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 2 }]}>Abrir cadastro de doses</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color={theme.colors.text.tertiary} />
                </Pressable>
              </Link>
            </OncoCard>
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
                      {latestSymptom ? labelSymptomCategory(latestSymptom.symptom_category) : "Nenhum registro"}
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
        fullName={profileName}
        avatarUri={avatarUri}
        onPressAvatar={onAvatarButtonPress}
        patient={patient}
        onSignOut={() => void signOut()}
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
    </ResponsiveScreen>
  );
}
