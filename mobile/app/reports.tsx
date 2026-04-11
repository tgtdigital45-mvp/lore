import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, InteractionManager, Pressable, ScrollView, Switch, Text, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Href } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { supabase } from "@/src/lib/supabase";
import { buildReportHtml, DEFAULT_REPORT_FLAGS, type ReportSectionFlags } from "@/src/reports/buildReportHtml";
import type { BiomarkerRow } from "@/src/reports/reportSections";
import type { TreatmentCycleRow, TreatmentInfusionRow } from "@/src/types/treatment";
import type { NutritionLogRow, VitalLogRow } from "@/src/types/vitalsNutrition";

const PERIODS = [7, 14, 21] as const;

const SECTION_CONFIG: { key: keyof ReportSectionFlags; label: string }[] = [
  { key: "header", label: "Identificação (nome, cancro, estágio, ID Aura)" },
  { key: "symptoms", label: "Sintomas" },
  { key: "vitals", label: "Sinais vitais" },
  { key: "medsTaken", label: "Medicamentos tomados / agendados" },
  { key: "medsActive", label: "Prescrições ativas" },
  { key: "nutrition", label: "Nutrição" },
  { key: "treatment", label: "Tratamento (ciclo e infusões)" },
  { key: "biomarkers", label: "Biomarcadores / exames" },
];

function lastNextInfusionSummary(infusions: TreatmentInfusionRow[], cycleLast: string | null) {
  const now = Date.now();
  const completed = infusions
    .filter((i) => i.status === "completed")
    .sort((a, b) => new Date(b.session_at).getTime() - new Date(a.session_at).getTime());
  const lastIso = completed[0]?.session_at ?? cycleLast;
  const upcoming = infusions
    .filter((i) => i.status === "scheduled" && new Date(i.session_at).getTime() > now)
    .sort((a, b) => new Date(a.session_at).getTime() - new Date(b.session_at).getTime());
  const next = upcoming[0];
  const nextLabel = next ? new Date(next.session_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Sem sessão agendada";
  return { lastIso, nextLabel };
}

export default function ReportsScreen() {
  const { theme } = useAppTheme();
  const goBack = useStackBack("/(tabs)/index" as Href);
  const { patient } = usePatient();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(14);
  const [busy, setBusy] = useState(false);
  const [flags, setFlags] = useState<ReportSectionFlags>({ ...DEFAULT_REPORT_FLAGS });

  const fromIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [days]);

  const toggleFlag = useCallback((key: keyof ReportSectionFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const generateReportPdf = useCallback(async (): Promise<string | null> => {
    if (!patient) return null;
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { data: prof } = uid
        ? await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle()
        : { data: null };
      const fullName = typeof prof?.full_name === "string" ? prof.full_name : null;

      const [
        { data: sym },
        { data: medLogs },
        { data: meds },
        { data: vitalRows },
        { data: nutritionRows },
        { data: bioHistory },
        { data: cycles },
      ] = await Promise.all([
        supabase
          .from("symptom_logs")
          .select(
            "entry_kind, symptom_category, severity, pain_level, nausea_level, fatigue_level, mood, notes, body_temperature, logged_at"
          )
          .eq("patient_id", patient.id)
          .gte("logged_at", fromIso)
          .order("logged_at", { ascending: false }),
        supabase
          .from("medication_logs")
          .select("medication_id, scheduled_time, taken_time, status")
          .eq("patient_id", patient.id)
          .gte("scheduled_time", fromIso)
          .order("scheduled_time", { ascending: false }),
        supabase.from("medications").select("name, dosage, frequency_hours, active").eq("patient_id", patient.id),
        supabase.from("vital_logs").select("*").eq("patient_id", patient.id).gte("logged_at", fromIso).order("logged_at", { ascending: false }),
        supabase
          .from("nutrition_logs")
          .select("*")
          .eq("patient_id", patient.id)
          .gte("logged_at", fromIso)
          .order("logged_at", { ascending: false }),
        supabase
          .from("biomarker_logs")
          .select("name, value_numeric, value_text, unit, logged_at")
          .eq("patient_id", patient.id)
          .order("logged_at", { ascending: false })
          .limit(2000),
        supabase
          .from("treatment_cycles")
          .select(
            "id, protocol_name, start_date, end_date, status, treatment_kind, planned_sessions, completed_sessions, last_session_at, last_weight_kg"
          )
          .eq("patient_id", patient.id)
          .eq("status", "active")
          .order("start_date", { ascending: false })
          .limit(1),
      ]);

      const medIds = [...new Set((medLogs ?? []).map((r) => (r as { medication_id: string }).medication_id))];
      let medMeta = new Map<string, { name: string; dosage: string | null }>();
      if (medIds.length > 0) {
        const { data: mrows } = await supabase.from("medications").select("id, name, dosage").in("id", medIds);
        medMeta = new Map(
          (mrows ?? []).map((r) => [String((r as { id: string }).id), r as { name: string; dosage: string | null }])
        );
      }

      const activeCycle = (cycles?.[0] ?? null) as TreatmentCycleRow | null;
      let infusionsAll: TreatmentInfusionRow[] = [];
      let infusionsInPeriod: TreatmentInfusionRow[] = [];
      if (activeCycle?.id) {
        const { data: inf } = await supabase
          .from("treatment_infusions")
          .select("id, patient_id, cycle_id, session_at, status, weight_kg, notes, created_at, updated_at")
          .eq("cycle_id", activeCycle.id)
          .order("session_at", { ascending: false });
        infusionsAll = (inf ?? []) as TreatmentInfusionRow[];
        const fromMs = new Date(fromIso).getTime();
        infusionsInPeriod = infusionsAll.filter((i) => new Date(i.session_at).getTime() >= fromMs);
      }

      const { lastIso, nextLabel } = lastNextInfusionSummary(infusionsAll, activeCycle?.last_session_at ?? null);

      const html = buildReportHtml({
        days,
        generatedAt: new Date(),
        flags,
        patient: {
          fullName,
          primaryCancerType: patient.primary_cancer_type,
          currentStage: patient.current_stage,
          patientCode: patient.patient_code,
        },
        symptomRows: (sym ?? []) as Record<string, unknown>[],
        vitalRows: (vitalRows ?? []) as VitalLogRow[],
        medLogs: (medLogs ?? []) as {
          medication_id: string;
          scheduled_time: string;
          taken_time: string | null;
          status: string;
        }[],
        medMeta,
        medications: (meds ?? []) as { name?: string; dosage?: string | null; frequency_hours?: number; active?: boolean }[],
        nutritionRows: (nutritionRows ?? []) as NutritionLogRow[],
        treatmentCycle: activeCycle,
        infusionsInPeriod,
        lastInfusionIso: lastIso,
        nextInfusionSummary: nextLabel,
        biomarkerRowsAll: (bioHistory ?? []) as BiomarkerRow[],
        reportPeriodFromIso: fromIso,
      });

      const { uri } = await Print.printToFileAsync({ html });
      return uri;
    } catch (e) {
      Alert.alert("Relatório", e instanceof Error ? e.message : "Falha ao gerar PDF.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [patient, days, fromIso, flags]);

  const buildPdf = useCallback(async () => {
    if (!patient) return;
    const uri = await generateReportPdf();
    if (!uri) return;

    try {
      const can = await Sharing.isAvailableAsync();
      if (!can) {
        Alert.alert("Relatório", "PDF gerado; partilha não disponível neste ambiente.");
        return;
      }
      await Promise.race([
        new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 120)),
      ]);
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Partilhar relatório" });
    } catch {
      // Utilizador fechou o diálogo ou falha nativa — não bloquear a UI
    }
  }, [patient, generateReportPdf]);

  if (!patient) {
    return (
      <ResponsiveScreen>
        <Text style={{ color: theme.colors.text.secondary }}>Complete o cadastro do paciente.</Text>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
        <Pressable onPress={goBack} style={{ marginBottom: theme.spacing.md }}>
          <Text style={{ color: theme.colors.semantic.treatment, fontWeight: "600" }}>← Voltar</Text>
        </Pressable>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Relatórios</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          Gere um PDF com marca Aura para partilhar com a sua equipa (WhatsApp, e-mail, etc.). Escolha o período e as secções.
        </Text>

        <Text style={[theme.typography.headline, { marginTop: theme.spacing.lg, color: theme.colors.text.primary }]}>Período</Text>
        <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm, flexWrap: "wrap" }}>
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setDays(p)}
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: days === p ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
              }}
            >
              <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>{p} dias</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[theme.typography.headline, { marginTop: theme.spacing.lg, color: theme.colors.text.primary }]}>Secções no PDF</Text>
        <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.xs }}>
          {SECTION_CONFIG.map(({ key, label }) => (
            <View
              key={key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                backgroundColor: theme.colors.background.primary,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.xs,
              }}
            >
              <Text style={{ flex: 1, color: theme.colors.text.primary, fontSize: 15, paddingRight: theme.spacing.md }}>{label}</Text>
              <Switch
                value={flags[key]}
                onValueChange={() => toggleFlag(key)}
                trackColor={{ false: theme.colors.background.tertiary, true: theme.colors.semantic.treatment }}
              />
            </View>
          ))}
        </View>

        <Pressable
          onPress={buildPdf}
          disabled={busy}
          style={{
            marginTop: theme.spacing.xl,
            backgroundColor: theme.colors.semantic.nutrition,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: theme.spacing.sm,
          }}
        >
          {busy ? <ActivityIndicator color="#fff" /> : null}
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Gerar PDF e partilhar</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
