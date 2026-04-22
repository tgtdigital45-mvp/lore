import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/src/components/BottomSheetModal";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { showAppToast } from "@/src/lib/appToast";
import { supabase } from "@/src/lib/supabase";
import type { OcrExtractedPayload } from "@/src/exams/ocrReviewTypes";
import { dateInputToExamPerformedAt, formatProfessionalRegistriesDisplay, parseProfessionalRegistriesFromJson } from "@/src/exams/examHelpers";

type Props = {
  visible: boolean;
  patientId: string | null;
  documentId: string | null;
  extracted: OcrExtractedPayload | null;
  onClose: () => void;
  onSaved: () => void;
};

export function OcrReviewBottomSheet({
  visible,
  patientId,
  documentId,
  extracted,
  onClose,
  onSaved,
}: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [title, setTitle] = useState("");
  const [doctor, setDoctor] = useState("");
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [addMedsBusy, setAddMedsBusy] = useState(false);

  useEffect(() => {
    if (visible && extracted) {
      setTitle(extracted.title_pt_br ?? "");
      setDoctor(extracted.doctor_name ?? "");
      const iso = (extracted.exam_date_iso ?? "").trim().slice(0, 10);
      setExamDate(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "");
    }
  }, [visible, extracted, documentId]);

  const save = useCallback(async () => {
    if (!patientId || !documentId || !extracted) return;
    setSaving(true);
    try {
      const dateIso = examDate.trim().slice(0, 10);
      const next: OcrExtractedPayload = {
        ...extracted,
        title_pt_br: title.trim(),
        doctor_name: doctor.trim(),
        professional_registries: extracted.professional_registries ?? [],
        exam_date_iso: /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? dateIso : "",
      };
      const examPerformedAt = /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? dateInputToExamPerformedAt(dateIso) : null;
      const { error } = await supabase
        .from("medical_documents")
        .update({
          ai_extracted_json: next as unknown as Record<string, unknown>,
          exam_performed_at: examPerformedAt,
        })
        .eq("id", documentId)
        .eq("patient_id", patientId);
      if (error) {
        showAppToast("error", "Exames", error.message);
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [patientId, documentId, extracted, title, doctor, examDate, onClose, onSaved]);

  const addPrescriptionMedsToTab = useCallback(async () => {
    if (!patientId || !extracted?.prescription_items?.length) return;
    setAddMedsBusy(true);
    try {
      const { data: maxSortRow } = await supabase
        .from("medications")
        .select("sort_order")
        .eq("patient_id", patientId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      let nextSort = (maxSortRow?.sort_order ?? -1) + 1;
      const anchor = new Date();
      anchor.setHours(8, 0, 0, 0);
      const anchorAt = anchor.toISOString();

      for (const it of extracted.prescription_items) {
        const name = it.name?.trim();
        if (!name) continue;
        let endDate: string | null = null;
        if (it.duration_days != null && it.duration_days > 0) {
          const e = new Date(anchor);
          e.setDate(e.getDate() + it.duration_days);
          endDate = e.toISOString().slice(0, 10);
        }
        const freq = Math.min(168, Math.max(1, Math.round(Number(it.frequency_hours) || 24)));
        const pos = (it.posology ?? "").trim();
        const n = (it.notes ?? "").trim();
        const notes = pos && n ? `${pos}\n\n${n}` : pos || n || null;
        const dosageText = [it.dosage?.trim(), it.form?.trim()].filter(Boolean).join(" · ") || null;

        const { error } = await supabase.from("medications").insert({
          patient_id: patientId,
          name,
          dosage: dosageText,
          form: it.form?.trim() || null,
          frequency_hours: freq,
          anchor_at: anchorAt,
          end_date: endDate,
          active: true,
          archived: false,
          sort_order: nextSort,
          notes,
          repeat_mode: "interval_hours",
          schedule_weekdays: null,
          unit: null,
          display_name: null,
          shape: null,
          color_left: null,
          color_right: null,
          color_bg: null,
        });
        if (error) {
          showAppToast("error", "Medicamentos", error.message);
          return;
        }
        nextSort += 1;
      }
      showAppToast("success", "Medicamentos", "Medicamentos adicionados à aba.");
      onSaved();
      onClose();
    } finally {
      setAddMedsBusy(false);
    }
  }, [patientId, extracted, onSaved, onClose]);

  if (!extracted) return null;

  const rxItems = extracted.prescription_items ?? [];
  const showRxMeds =
    extracted.ui_category === "receitas" && rxItems.length > 0;

  const registriesDisplay = formatProfessionalRegistriesDisplay(
    parseProfessionalRegistriesFromJson(extracted as unknown as Record<string, unknown>)
  );

  return (
    <BottomSheetModal visible={visible} onClose={onClose} maxHeightFraction={0.92}>
      <View
        style={{
          maxHeight: winH * 0.92,
          backgroundColor: theme.colors.background.primary,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
        }}
      >
          <View style={{ alignItems: "center", paddingTop: theme.spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border.divider,
              }}
            />
          </View>

          <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Rever extração</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
              Confira o resumo e as métricas. Pode editar título e médico; o resto é gerado pela IA.
            </Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: winH * 0.62 }}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#007AFF", marginBottom: 6 }}>Título (editável)</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Título do documento"
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border.divider,
                borderRadius: 12,
                padding: theme.spacing.md,
                fontSize: 16,
                color: theme.colors.text.primary,
                minHeight: 44,
                textAlignVertical: "top",
              }}
            />

            <Text style={{ fontSize: 12, fontWeight: "700", color: "#007AFF", marginTop: theme.spacing.md, marginBottom: 6 }}>
              Médico (editável)
            </Text>
            <TextInput
              value={doctor}
              onChangeText={setDoctor}
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

            {registriesDisplay ? (
              <View style={{ marginTop: theme.spacing.md }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#007AFF", marginBottom: 6 }}>
                  Registos profissionais (CRM, CRO…)
                </Text>
                <Text style={{ fontSize: 15, color: theme.colors.text.primary, lineHeight: 22 }}>{registriesDisplay}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 12, fontWeight: "700", color: "#007AFF", marginTop: theme.spacing.md, marginBottom: 6 }}>
              Data do exame (AAAA-MM-DD, opcional)
            </Text>
            <TextInput
              value={examDate}
              onChangeText={setExamDate}
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

            <View style={{ marginTop: theme.spacing.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: theme.spacing.sm }}>
                <FontAwesome name="bolt" size={14} color="#007AFF" />
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#007AFF", letterSpacing: 0.6 }}>RESUMO DA IA</Text>
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.text.primary, lineHeight: 22 }]}>
                {extracted.summary_pt_br || "—"}
              </Text>
            </View>

            {extracted.confidence_note?.trim() ? (
              <View style={{ marginTop: theme.spacing.md }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.text.secondary, marginBottom: 6 }}>
                  Nota da IA
                </Text>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 14, lineHeight: 20 }}>{extracted.confidence_note}</Text>
              </View>
            ) : null}

            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
              Métricas extraídas
            </Text>
            {extracted.metrics.length === 0 ? (
              <Text style={{ color: theme.colors.text.secondary, marginTop: theme.spacing.sm }}>Nenhuma métrica estruturada.</Text>
            ) : (
              extracted.metrics.map((m, i) => (
                <View
                  key={`${m.name}-${i}`}
                  style={{
                    marginTop: theme.spacing.sm,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.background.secondary,
                    borderWidth: 1,
                    borderColor: theme.colors.border.divider,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: theme.colors.text.primary }}>{m.name}</Text>
                  <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "600", color: "#007AFF" }}>
                    {m.value}
                    {m.unit ? ` ${m.unit}` : ""}
                  </Text>
                  {m.reference_range?.trim() ? (
                    <Text style={{ marginTop: 6, fontSize: 13, color: theme.colors.text.secondary }}>
                      Ref. no documento: {m.reference_range.trim()}
                    </Text>
                  ) : null}
                  {m.is_abnormal && m.reference_alert?.trim() ? (
                    <Text style={{ marginTop: 8, color: "#C2410C", fontSize: 13 }}>{m.reference_alert}</Text>
                  ) : null}
                </View>
              ))
            )}

            {showRxMeds ? (
              <View style={{ marginTop: theme.spacing.lg }}>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Medicamentos prescritos</Text>
                {rxItems.map((it, i) => (
                  <View
                    key={`${it.name}-${i}`}
                    style={{
                      marginTop: theme.spacing.sm,
                      padding: theme.spacing.md,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.background.secondary,
                      borderWidth: 1,
                      borderColor: theme.colors.border.divider,
                    }}
                  >
                    <Text style={{ fontWeight: "800", color: theme.colors.text.primary }}>{it.name}</Text>
                    <Text style={{ marginTop: 4, color: theme.colors.text.secondary, fontSize: 14 }}>
                      {[it.dosage, it.form].filter(Boolean).join(" · ") || "—"}
                    </Text>
                    {it.posology?.trim() ? (
                      <Text style={{ marginTop: 6, color: theme.colors.text.primary, fontSize: 15, lineHeight: 22 }}>
                        {it.posology.trim()}
                      </Text>
                    ) : null}
                  </View>
                ))}
                <Pressable
                  onPress={() => void addPrescriptionMedsToTab()}
                  disabled={addMedsBusy}
                  style={{
                    marginTop: theme.spacing.md,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: addMedsBusy ? "#94A3B8" : "#0F766E",
                    alignItems: "center",
                  }}
                >
                  {addMedsBusy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontWeight: "800", color: "#FFFFFF", fontSize: 16 }}>Adicionar à aba Medicamentos</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.divider,
            }}
          >
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: theme.colors.background.secondary,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "700", color: theme.colors.text.secondary, fontSize: 17 }}>Fechar</Text>
            </Pressable>
            <Pressable
              onPress={() => void save()}
              disabled={saving}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: "#007AFF",
                alignItems: "center",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontWeight: "700", color: "#FFFFFF", fontSize: 17 }}>Guardar</Text>
              )}
            </Pressable>
          </View>
      </View>
    </BottomSheetModal>
  );
}
