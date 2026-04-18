import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MaterialIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import type { ExamMetric } from "@/src/exams/examTypes";
import { metricsFromJson } from "@/src/exams/examTypes";
import {
  buildMetricHistorySeries,
  fetchBiomarkerHistoryContext,
  type MetricHistoryChartModel,
} from "@/src/exams/biomarkerHistoryChart";
import {
  dateInputToExamPerformedAt,
  examDisplayDateIso,
  examPerformedAtToDateInput,
  formatExamDate,
  formatProfessionalRegistriesDisplay,
  getDocumentTitle,
  kindBadge,
  parseProfessionalRegistriesFromJson,
  registryEditRowsFromJson,
  registryEditRowsToSave,
  type RegistryEditRow,
} from "@/src/exams/examHelpers";
import type { MedicalDocRow } from "@/src/exams/examHelpers";
import { documentTypeLabel } from "@/src/i18n/ui";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { useStackBack } from "@/src/hooks/useStackBack";
import { showAppToast } from "@/src/lib/appToast";
import { getApiBaseUrl } from "@/src/lib/apiConfig";
import { instrumentedFetch } from "@/src/lib/instrumentedFetch";
import { supabase } from "@/src/lib/supabase";

type BiomarkerRow = {
  id: string;
  name: string;
  value_text: string | null;
  value_numeric: number | null;
  unit: string | null;
  is_abnormal: boolean;
  reference_alert: string | null;
};

function rowToMetrics(rows: BiomarkerRow[]): ExamMetric[] {
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    value: r.value_text ?? (r.value_numeric != null ? String(r.value_numeric) : "—"),
    unit: r.unit ?? "",
    isAbnormal: r.is_abnormal,
    referenceAlert: r.reference_alert ?? "",
  }));
}

function shortenShareUrl(url: string, maxLen = 54): string {
  const u = url.trim();
  if (u.length <= maxLen) return u;
  const head = 26;
  const tail = 14;
  return `${u.slice(0, head)}…${u.slice(-tail)}`;
}

function longDatePt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goBack = useStackBack("/(tabs)/exams" as Href);
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const { session } = useAuth();
  const { patient } = usePatient();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<MedicalDocRow | null>(null);
  const [metrics, setMetrics] = useState<ExamMetric[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editDoctor, setEditDoctor] = useState("");
  const [editRegistries, setEditRegistries] = useState<RegistryEditRow[]>([{ kind: "", number: "", uf: "" }]);
  const [editExamDate, setEditExamDate] = useState("");
  const [metaEditing, setMetaEditing] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metricCharts, setMetricCharts] = useState<MetricHistoryChartModel[]>([]);

  const chartWidth = useMemo(
    () => Math.min(Dimensions.get("window").width - theme.spacing.md * 4, 400),
    [theme.spacing.md]
  );

  const load = useCallback(async () => {
    if (!patient || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: doc, error: dErr } = await supabase
      .from("medical_documents")
      .select("id, document_type, uploaded_at, exam_performed_at, ai_extracted_json")
      .eq("id", id)
      .eq("patient_id", patient.id)
      .maybeSingle();
    if (dErr || !doc) {
      setRow(null);
      setMetrics([]);
      setMetricCharts([]);
      setLoading(false);
      return;
    }
    const docRow = doc as MedicalDocRow;
    setRow(docRow);

    const { data: logs, error: logErr } = await supabase
      .from("biomarker_logs")
      .select("id, name, value_text, value_numeric, unit, is_abnormal, reference_alert")
      .eq("medical_document_id", id)
      .order("logged_at", { ascending: true });

    let nextMetrics: ExamMetric[];
    if (!logErr && logs && logs.length > 0) {
      nextMetrics = rowToMetrics(logs as BiomarkerRow[]);
    } else {
      nextMetrics = metricsFromJson(doc.ai_extracted_json as Record<string, unknown> | null);
    }
    setMetrics(nextMetrics);

    const hist = await fetchBiomarkerHistoryContext(patient.id);
    setMetricCharts(
      nextMetrics.map((m) =>
        buildMetricHistorySeries(m.name, hist.logs, hist.docMap, {
          documentType: docRow.document_type,
          currentDocumentId: id,
          currentReading: { valueText: m.value, examDateIso: examDisplayDateIso(docRow) },
        })
      )
    );
    setLoading(false);
  }, [id, patient]);

  useEffect(() => {
    if (!row?.ai_extracted_json) {
      setEditTitle("");
      setEditDoctor("");
      setEditRegistries([{ kind: "", number: "", uf: "" }]);
      return;
    }
    const j = row.ai_extracted_json as Record<string, unknown>;
    setEditTitle(typeof j.title_pt_br === "string" ? j.title_pt_br : "");
    setEditDoctor(typeof j.doctor_name === "string" ? j.doctor_name : "");
    setEditRegistries(registryEditRowsFromJson(j));
  }, [row?.id, row?.ai_extracted_json]);

  useEffect(() => {
    if (!row) {
      setEditExamDate("");
      return;
    }
    setEditExamDate(examPerformedAtToDateInput(examDisplayDateIso(row)));
  }, [row?.id, row?.exam_performed_at, row?.uploaded_at]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const title = row ? getDocumentTitle(row) : "Exame";
  const categoryLine = row ? documentTypeLabel[row.document_type] ?? row.document_type : "";
  const dateLine = row ? longDatePt(examDisplayDateIso(row)) : "";
  const usedUploadFallback =
    row &&
    (!row.exam_performed_at ||
      (typeof row.exam_performed_at === "string" && row.exam_performed_at.trim() === ""));
  const summary =
    row && row.ai_extracted_json && typeof (row.ai_extracted_json as { summary_pt_br?: string }).summary_pt_br === "string"
      ? (row.ai_extracted_json as { summary_pt_br: string }).summary_pt_br
      : "";
  const confidenceNote =
    row && row.ai_extracted_json && typeof (row.ai_extracted_json as { confidence_note?: string }).confidence_note === "string"
      ? (row.ai_extracted_json as { confidence_note: string }).confidence_note.trim()
      : "";
  const badge = row ? kindBadge(row.document_type) : "";

  const registriesDisplayLine = useMemo(() => {
    if (!row?.ai_extracted_json) return "";
    return formatProfessionalRegistriesDisplay(
      parseProfessionalRegistriesFromJson(row.ai_extracted_json as Record<string, unknown>)
    );
  }, [row]);

  const abnormalAlerts = useMemo(
    () => metrics.filter((m) => m.isAbnormal && m.referenceAlert.trim()),
    [metrics]
  );

  const shareExam = useCallback(async () => {
    if (!session?.access_token || !id) return;
    try {
      const res = await instrumentedFetch(`${getApiBaseUrl()}/api/exams/${id}/share`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }, `exams:${id}/share`);
      const data = (await res.json()) as { url?: string; message?: string; error?: string };
      if (!res.ok) {
        showAppToast("error", "Partilha", data.message ?? data.error ?? "Não foi possível gerar o link.");
        return;
      }
      if (data.url) {
        const link = shortenShareUrl(data.url);
        const msg = `Documento clínico — ligação segura (~7 dias)\n${link}`;
        if (Platform.OS === "ios") {
          await Share.share({ message: msg, url: data.url });
        } else {
          await Share.share({ message: `${msg}\n${data.url}` });
        }
      }
    } catch {
      showAppToast("error", "Partilha", "Não foi possível ligar ao servidor.");
    }
  }, [id, session?.access_token]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => void shareExam()} hitSlop={12} accessibilityLabel="Compartilhar">
          <FontAwesome name="share-alt" size={22} color="#007AFF" />
        </Pressable>
      ),
    });
  }, [navigation, shareExam]);

  function resetMetaFromRow() {
    if (!row?.ai_extracted_json) {
      setEditTitle("");
      setEditDoctor("");
      setEditRegistries([{ kind: "", number: "", uf: "" }]);
      setEditExamDate("");
      return;
    }
    const j = row.ai_extracted_json as Record<string, unknown>;
    setEditTitle(typeof j.title_pt_br === "string" ? j.title_pt_br : "");
    setEditDoctor(typeof j.doctor_name === "string" ? j.doctor_name : "");
    setEditRegistries(registryEditRowsFromJson(j));
    setEditExamDate(examPerformedAtToDateInput(examDisplayDateIso(row)));
  }

  async function saveMetadata() {
    if (!patient || !row || !id) return;
    setSavingMeta(true);
    try {
      const prev = (row.ai_extracted_json as Record<string, unknown> | null) ?? {};
      const dateSlice = editExamDate.trim().slice(0, 10);
      const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateSlice);
      const examPerformedAt = hasValidDate ? dateInputToExamPerformedAt(dateSlice) : null;
      const next = {
        ...prev,
        title_pt_br: editTitle.trim(),
        doctor_name: editDoctor.trim(),
        professional_registries: registryEditRowsToSave(editRegistries),
        exam_date_iso: hasValidDate ? dateSlice : "",
      };
      const { error } = await supabase
        .from("medical_documents")
        .update({ ai_extracted_json: next, exam_performed_at: examPerformedAt })
        .eq("id", id)
        .eq("patient_id", patient.id);
      if (error) {
        Alert.alert("Exames", error.message);
        return;
      }
      await load();
      setMetaEditing(false);
      Alert.alert("Guardado", "Dados do documento atualizados.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function openDocument() {
    if (!session?.access_token || !id) return;
    try {
      const res = await instrumentedFetch(`${getApiBaseUrl()}/api/exams/${id}/view`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }, `exams:${id}/view`);
      const data = (await res.json()) as { url?: string; message?: string; error?: string };
      if (!res.ok) {
        showAppToast("error", "Documento", data.message ?? data.error ?? "Não foi possível abrir o arquivo.");
        return;
      }
      if (data.url) {
        const ok = await Linking.canOpenURL(data.url);
        if (ok) await Linking.openURL(data.url);
      }
    } catch {
      showAppToast("error", "Documento", "Não foi possível ligar ao servidor.");
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Excluir exame",
      "O registro e o arquivo associado serão removidos. Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => void deleteExam(),
        },
      ]
    );
  }

  async function deleteExam() {
    if (!session?.access_token || !id) return;
    try {
      const res = await instrumentedFetch(`${getApiBaseUrl()}/api/exams/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }, `exams:${id}/delete`);
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        showAppToast("error", "Exames", data.error ?? "Não foi possível excluir.");
        return;
      }
      goBack();
    } catch {
      showAppToast("error", "Exames", "Não foi possível ligar ao servidor.");
    }
  }

  const surface = {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 24,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.divider,
  };

  if (loading) {
    return (
      <ResponsiveScreen variant="tabGradient" headerShown>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </ResponsiveScreen>
    );
  }

  if (!row) {
    return (
      <ResponsiveScreen variant="tabGradient" headerShown>
        <View style={{ padding: theme.spacing.lg }}>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
            Exame não encontrado ou sem permissão.
          </Text>
        </View>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen variant="tabGradient" headerShown>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "#E8F4FF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome name="file-text-o" size={26} color="#007AFF" />
          </View>
          <Text
            style={{
              marginTop: theme.spacing.md,
              fontSize: 20,
              fontWeight: "800",
              color: theme.colors.text.primary,
              textAlign: "center",
              paddingHorizontal: theme.spacing.sm,
            }}
          >
            {editTitle.trim() || title}
          </Text>
          <Text
            style={{
              marginTop: theme.spacing.xs,
              fontSize: 13,
              fontWeight: "600",
              color: theme.colors.text.secondary,
              letterSpacing: 0.5,
              textAlign: "center",
            }}
          >
            {badge}
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 15,
              color: theme.colors.text.secondary,
              textAlign: "center",
            }}
          >
            {categoryLine} · {dateLine}
          </Text>
        </View>

        <View style={[surface, { marginTop: theme.spacing.lg, marginHorizontal: 0 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.sm }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#007AFF" }}>Dados do documento</Text>
            {!metaEditing ? (
              <Pressable onPress={() => setMetaEditing(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Editar dados">
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#007AFF" }}>Editar</Text>
              </Pressable>
            ) : null}
          </View>

          {!metaEditing ? (
            <>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>
                Toque em Editar para alterar título, médico, registos profissionais (CRM, CRO…) ou data do exame.
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 }}>Título</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: theme.colors.text.primary, marginBottom: theme.spacing.md }}>
                {editTitle.trim() || title}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 }}>Médico</Text>
              <Text style={{ fontSize: 16, color: theme.colors.text.primary, marginBottom: theme.spacing.md }}>
                {editDoctor.trim() || "—"}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 }}>
                Registos profissionais (CRM, CRO…)
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing.md,
                  lineHeight: 22,
                }}
              >
                {registriesDisplayLine || "—"}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: theme.spacing.xs }}>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 15 }}>Data do exame</Text>
                <Text style={{ fontWeight: "700", color: theme.colors.text.primary }}>
                  {formatExamDate(examDisplayDateIso(row))}
                </Text>
              </View>
              {usedUploadFallback ? (
                <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, lineHeight: 18, marginTop: 8 }}>
                  Não foi possível ler a data do exame no documento — está indicada a data de registro na app.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>
                O resumo da IA e as métricas abaixo são só leitura.
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 }}>Título</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Título do documento"
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.divider,
                  borderRadius: 12,
                  padding: theme.spacing.md,
                  fontSize: 17,
                  fontWeight: "700",
                  color: theme.colors.text.primary,
                  minHeight: 48,
                  textAlignVertical: "top",
                }}
              />
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: theme.spacing.md, marginBottom: 4 }}>
                Médico (responsável no documento)
              </Text>
              <TextInput
                value={editDoctor}
                onChangeText={setEditDoctor}
                placeholder="Nome do médico"
                placeholderTextColor={theme.colors.text.tertiary}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.divider,
                  borderRadius: 12,
                  padding: theme.spacing.md,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                }}
              />
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: theme.spacing.md, marginBottom: 6 }}>
                Registos profissionais (CRM, CRO, COREN…)
              </Text>
              {editRegistries.map((reg, idx) => (
                <View key={`reg-${idx}`} style={{ marginBottom: theme.spacing.md }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.text.secondary }}>
                      Registo {idx + 1}
                    </Text>
                    {editRegistries.length > 1 ? (
                      <Pressable
                        onPress={() => setEditRegistries((prev) => prev.filter((_, i) => i !== idx))}
                        hitSlop={8}
                        accessibilityLabel="Remover registo"
                      >
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#FF3B30" }}>Remover</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <TextInput
                    value={reg.kind}
                    onChangeText={(t) =>
                      setEditRegistries((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], kind: t };
                        return next;
                      })
                    }
                    placeholder="Tipo (ex.: CRM)"
                    placeholderTextColor={theme.colors.text.tertiary}
                    autoCapitalize="characters"
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border.divider,
                      borderRadius: 12,
                      padding: theme.spacing.md,
                      fontSize: 16,
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.sm,
                    }}
                  />
                  <TextInput
                    value={reg.number}
                    onChangeText={(t) =>
                      setEditRegistries((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], number: t };
                        return next;
                      })
                    }
                    placeholder="Número"
                    placeholderTextColor={theme.colors.text.tertiary}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border.divider,
                      borderRadius: 12,
                      padding: theme.spacing.md,
                      fontSize: 16,
                      color: theme.colors.text.primary,
                      marginBottom: theme.spacing.sm,
                    }}
                  />
                  <TextInput
                    value={reg.uf}
                    onChangeText={(t) =>
                      setEditRegistries((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], uf: t.slice(0, 2) };
                        return next;
                      })
                    }
                    placeholder="UF (opcional, 2 letras)"
                    placeholderTextColor={theme.colors.text.tertiary}
                    autoCapitalize="characters"
                    maxLength={2}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border.divider,
                      borderRadius: 12,
                      padding: theme.spacing.md,
                      fontSize: 16,
                      color: theme.colors.text.primary,
                    }}
                  />
                </View>
              ))}
              <Pressable
                onPress={() => setEditRegistries((prev) => [...prev, { kind: "", number: "", uf: "" }])}
                style={{ alignSelf: "flex-start", marginBottom: theme.spacing.sm }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#007AFF" }}>+ Adicionar registo</Text>
              </Pressable>
              <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginBottom: theme.spacing.md, lineHeight: 18 }}>
                Só são gravados os registos com tipo e número preenchidos. A UF é opcional (ex.: SP).
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 }}>
                Data do exame (AAAA-MM-DD)
              </Text>
              <TextInput
                value={editExamDate}
                onChangeText={setEditExamDate}
                placeholder="2026-04-01"
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border.divider,
                  borderRadius: 12,
                  padding: theme.spacing.md,
                  fontSize: 16,
                  color: theme.colors.text.primary,
                }}
              />
              <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, marginTop: 6 }}>
                Deixe em branco ou incompleto para limpar a data gravada.
              </Text>
              <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <Pressable
                  onPress={() => {
                    resetMetaFromRow();
                    setMetaEditing(false);
                  }}
                  disabled={savingMeta}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: theme.colors.background.secondary,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: theme.colors.text.secondary, fontSize: 17 }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => void saveMetadata()}
                  disabled={savingMeta}
                  style={{
                    flex: 1,
                    backgroundColor: "#007AFF",
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    opacity: savingMeta ? 0.65 : 1,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 17 }}>
                    {savingMeta ? "A guardar…" : "Guardar"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          <Pressable
            onPress={() => void openDocument()}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: theme.spacing.md,
              borderRadius: 16,
              backgroundColor: theme.colors.background.primary,
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
            }}
          >
            <FontAwesome name="eye" size={18} color="#007AFF" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#007AFF", marginTop: 4 }}>Ver</Text>
          </Pressable>
          <Pressable
            onPress={() => void shareExam()}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: theme.spacing.md,
              borderRadius: 16,
              backgroundColor: theme.colors.background.primary,
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
            }}
          >
            <FontAwesome name="share-alt" size={18} color="#007AFF" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#007AFF", marginTop: 4 }}>Compartilhar</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: theme.spacing.md,
              borderRadius: 16,
              backgroundColor: theme.colors.background.primary,
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
            }}
          >
            <FontAwesome name="trash-o" size={18} color="#FF3B30" />
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#FF3B30", marginTop: 4 }}>Excluir</Text>
          </Pressable>
        </View>

        {abnormalAlerts.length > 0 ? (
          <View
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.md,
              borderRadius: 16,
              backgroundColor: "rgba(254, 226, 226, 0.85)",
              borderWidth: 1,
              borderColor: "rgba(252, 165, 165, 0.9)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <FontAwesome name="exclamation-triangle" size={20} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: "#991B1B", marginBottom: 6 }}>Alerta clínico</Text>
                <Text style={{ color: "#7F1D1D", fontSize: 13, marginBottom: 8, lineHeight: 18 }}>
                  Valores fora do intervalo de referência indicado no próprio documento (não substitui avaliação médica).
                </Text>
                {abnormalAlerts.map((m, idx) => (
                  <View
                    key={(m.id ?? "") + m.name + m.referenceAlert}
                    style={{
                      marginBottom: idx < abnormalAlerts.length - 1 ? theme.spacing.md : 0,
                      paddingBottom: theme.spacing.sm,
                      borderBottomWidth: idx < abnormalAlerts.length - 1 ? 1 : 0,
                      borderBottomColor: "rgba(252, 165, 165, 0.45)",
                    }}
                  >
                    <Text style={{ fontWeight: "800", color: "#7F1D1D", fontSize: 16 }}>{m.name}</Text>
                    <Text style={{ color: "#991B1B", marginTop: 6, fontSize: 15 }}>
                      Valor: {m.value}
                      {m.unit ? ` ${m.unit}` : ""}
                    </Text>
                    {m.referenceRange ? (
                      <Text style={{ color: "#7F1D1D", marginTop: 6, fontSize: 14 }}>
                        Referência no documento: {m.referenceRange}
                      </Text>
                    ) : null}
                    {m.referenceAlert.trim() ? (
                      <Text style={{ color: "#7F1D1D", marginTop: 8, lineHeight: 22, fontSize: 14 }}>{m.referenceAlert.trim()}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        <Text style={{ marginTop: theme.spacing.lg, fontSize: 18, fontWeight: "800", color: theme.colors.text.primary }}>
          Análise da IA
        </Text>
        <View style={[surface, { marginTop: theme.spacing.sm }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: theme.spacing.sm }}>
            <MaterialIcons name="auto-awesome" size={22} color="#007AFF" />
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#007AFF", letterSpacing: 0.5 }}>RESUMO</Text>
          </View>
          <Text
            style={{
              color: theme.colors.text.primary,
              lineHeight: 24,
              fontSize: 16,
            }}
          >
            {summary || "Sem resumo disponível."}
          </Text>
          {confidenceNote ? (
            <View style={{ marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border.divider }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text.secondary, marginBottom: 6 }}>
                Nota da IA (leitura automática)
              </Text>
              <Text style={{ color: theme.colors.text.secondary, lineHeight: 20, fontSize: 14 }}>{confidenceNote}</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ marginTop: theme.spacing.lg, fontSize: 18, fontWeight: "800", color: theme.colors.text.primary }}>
          Métricas extraídas
        </Text>
        {metrics.length === 0 ? (
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Nenhuma métrica estruturada para este exame.
          </Text>
        ) : (
          metrics.map((m, idx) => {
            const abnormal = m.isAbnormal;
            const histModel = metricCharts[idx];
            return (
              <View
                key={m.id ?? m.name + m.value}
                style={[
                  surface,
                  {
                    marginTop: theme.spacing.sm,
                    backgroundColor: abnormal ? "rgba(255, 237, 213, 0.65)" : theme.colors.background.primary,
                    borderColor: abnormal ? "rgba(251, 146, 60, 0.45)" : theme.colors.border.divider,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={{ fontWeight: "700", color: theme.colors.text.primary, flex: 1, paddingRight: 8 }}>{m.name}</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "800", color: abnormal ? "#C2410C" : "#007AFF", fontSize: 18 }}>
                      {m.value}{" "}
                      {m.unit ? (
                        <Text style={{ fontSize: 13, fontWeight: "500", color: theme.colors.text.secondary }}>{m.unit}</Text>
                      ) : null}
                    </Text>
                  </View>
                </View>
                {m.referenceRange ? (
                  <Text style={{ marginTop: theme.spacing.sm, color: theme.colors.text.secondary, fontSize: 13 }}>
                    Ref. no documento: {m.referenceRange}
                  </Text>
                ) : null}
                {abnormal && m.referenceAlert ? (
                  <Text style={{ marginTop: theme.spacing.sm, color: "#9A3412", lineHeight: 20, fontSize: 14 }}>
                    {m.referenceAlert}
                  </Text>
                ) : null}
                <View style={{ marginTop: theme.spacing.md }}>
                  {histModel?.kind === "chart" ? (
                    <>
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }}>
                        {histModel.otherExams > 0
                          ? `Evolução com ${histModel.otherExams} exame(s) anterior(es) do mesmo tipo (datas por exame).`
                          : "Evolução no tempo (mesmo tipo de exame). Adicione exames anteriores para ver tendência."}
                      </Text>
                      <LineChart
                        data={histModel.data}
                        width={chartWidth}
                        height={170}
                        color={abnormal ? "#EA580C" : "#007AFF"}
                        thickness={3}
                        startFillColor={abnormal ? "#EA580C" : "#007AFF"}
                        endFillColor={abnormal ? "#EA580C" : "#007AFF"}
                        startOpacity={0.3}
                        endOpacity={0.05}
                        spacing={Math.max(40, chartWidth / Math.max(histModel.data.length, 2))}
                        hideDataPoints={false}
                        yAxisColor={theme.colors.border.divider}
                        xAxisColor={theme.colors.border.divider}
                        yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                        xAxisLabelTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
                        curved
                        areaChart
                      />
                    </>
                  ) : histModel?.kind === "non_numeric" ? (
                    <View
                      style={{
                        borderRadius: 12,
                        backgroundColor: theme.colors.background.secondary,
                        padding: theme.spacing.md,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.colors.text.secondary, textAlign: "center" }}>
                        Valor não numérico neste e nos outros registros — gráfico indisponível.
                      </Text>
                    </View>
                  ) : histModel?.kind === "empty" ? (
                    <View
                      style={{
                        borderRadius: 12,
                        backgroundColor: theme.colors.background.secondary,
                        padding: theme.spacing.md,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, textAlign: "center" }}>
                        {histModel.hint}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ minHeight: 40 }} />
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </ResponsiveScreen>
  );
}
