import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { CommonActions, useFocusEffect, useNavigation } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CategoryMoreSection } from "@/src/health/components/CategoryMoreSection";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { SymptomQuickLog } from "@/src/diary/SymptomQuickLog";
import type { SymptomDetailKey } from "@/src/diary/symptomCatalog";
import type { SymptomLogRow } from "@/src/diary/symptomLogTypes";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { usePinnedCategoryShortcut } from "@/src/hooks/usePinnedCategoryShortcut";
import { useTreatmentCycles } from "@/src/hooks/useTreatmentCycles";
import { supabase } from "@/src/lib/supabase";

export default function DiaryScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const goBackToHealth = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: "health",
        params: { screen: "index" },
      })
    );
  }, [navigation]);
  const { patient, refresh } = usePatient();
  const { cycles } = useTreatmentCycles(patient);
  const { pinned, toggle, ready: pinReady } = usePinnedCategoryShortcut("symptoms");

  const [logs, setLogs] = useState<SymptomLogRow[]>([]);
  const [symptomDetailFocus, setSymptomDetailFocus] = useState<SymptomDetailKey | null>(null);
  const hideDiaryChrome = symptomDetailFocus === "sleep_changes";
  const showGlobalHeaderBack = symptomDetailFocus === null;
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!patient) return;
    setLoadError(null);
    const { data, error } = await supabase
      .from("symptom_logs")
      .select(
        "id, entry_kind, symptom_category, severity, pain_level, nausea_level, fatigue_level, mood, body_temperature, notes, logged_at, symptom_started_at, symptom_ended_at, triage_semaphore, attachment_storage_path"
      )
      .eq("patient_id", patient.id)
      .order("logged_at", { ascending: false })
      .limit(400);
    if (error) {
      setLoadError("Não foi possível carregar sintomas. Tente novamente.");
      setLogs([]);
    } else if (data) {
      setLogs(data as SymptomLogRow[]);
    }
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs])
  );

  const onLogged = useCallback(
    async (opts?: { insertedRow?: SymptomLogRow }) => {
      if (opts?.insertedRow) {
        const row = opts.insertedRow;
        setLogs((prev) => [row, ...prev.filter((l) => l.id !== row.id)]);
      }
      await loadLogs();
      await refresh();
    },
    [loadLogs, refresh]
  );

  if (!patient) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <View style={{ flex: 1, paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.md }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sintomas</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Complete o cadastro em Resumo para registrar sintomas.
          </Text>
        </View>
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
        {showGlobalHeaderBack ? (
          <CircleChromeButton onPress={goBackToHealth} accessibilityLabel="Voltar para Saúde">
            <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
          </CircleChromeButton>
        ) : (
          <View style={{ width: 34 }} />
        )}
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
          Sintomas
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={Platform.OS === "android"}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, fontSize: 14 }]}>
            Registre como se sente; abra cada sintoma para gráficos e histórico completo.
          </Text>
          {patient.is_caregiver_session ? (
            <Text style={[theme.typography.body, { color: theme.colors.semantic.treatment, marginTop: theme.spacing.sm, fontWeight: "600" }]}>
              Modo cuidador: cada registro fica associado ao seu usuário (auditoria).
            </Text>
          ) : null}
          {loadError ? (
            <Pressable onPress={() => void loadLogs()} style={{ marginTop: theme.spacing.sm }}>
              <Text style={[theme.typography.body, { color: "#DC2626" }]}>{loadError} Toque para tentar novamente.</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: theme.spacing.md, marginTop: theme.spacing.sm }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.xs }]}>Registrar</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.md, fontSize: 13 }]}>
            Atalhos rápidos por sintoma (escala verbal alinhada ao CTCAE 0–5).
          </Text>
          <SymptomQuickLog
            theme={theme}
            patientId={patient.id}
            logs={logs}
            onLogged={onLogged}
            onSymptomDetailFocusChange={setSymptomDetailFocus}
            primaryCancerType={patient.primary_cancer_type}
            activeTreatmentKind={cycles.find((c) => c.status === "active")?.treatment_kind ?? null}
          />
        </View>

        {!hideDiaryChrome ? (
          <View style={{ paddingHorizontal: theme.spacing.md }}>
            <View
              style={{
                backgroundColor: theme.colors.background.primary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                ...IOS_HEALTH.shadow.card,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 112,
                  borderRadius: theme.radius.md,
                  backgroundColor: "#1a1020",
                  marginBottom: theme.spacing.md,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="book" size={40} color="#AF52DE" />
              </View>
              <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Sobre sintomas</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
                Acompanhar sintomas ajuda a perceber padrões e a comunicar com clareza à equipe. Os gráficos por tipo de sintoma estão
                dentro de cada categoria. Isto não substitui avaliação clínica nem orientação médica urgente.
              </Text>
            </View>

            {pinReady ? (
              <CategoryMoreSection
                theme={theme}
                pinned={pinned}
                onTogglePin={() => void toggle()}
                onExportPdf={() => router.push("/reports" as Href)}
                onOptionsPress={() => Alert.alert("Opções", "Preferências de sintomas em breve.")}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </ResponsiveScreen>
  );
}
