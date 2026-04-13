import { useRef, useState } from "react";
import { Alert, Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useMedications } from "@/src/hooks/useMedications";
import { usePatient } from "@/src/hooks/usePatient";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { scheduleMedicationNotifications } from "@/src/lib/medicationNotifications";
import { supabase } from "@/src/lib/supabase";
import { useMedicationWizard } from "@/src/medications/MedicationWizardContext";
import { MedicationWizardStepBadge } from "@/src/medications/components/MedicationWizardStepBadge";
import { PillPreview } from "@/src/medications/components/PillPreview";
import { scheduleItemToTimeOfDay } from "@/src/medications/scheduleUtils";
import type { DraftFrequency } from "@/src/medications/types";

function toISODate(d: Date): string {
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

function combineDateTime(day: Date, hours: number, minutes: number): Date {
  const o = new Date(day);
  o.setHours(hours, minutes, 0, 0);
  return o;
}

function repeatModeFromDraft(f: DraftFrequency): "daily" | "weekdays" | "interval_hours" | "as_needed" {
  return f;
}

function formatDosageLine(draft: {
  form: string | null;
  dosageAmount: string | null;
  unit: string | null;
}): string {
  const parts: string[] = [];
  if (draft.form) parts.push(draft.form);
  if (draft.dosageAmount?.trim()) {
    parts.push(`${draft.dosageAmount.trim()}${draft.unit ? ` ${draft.unit}` : ""}`);
  }
  return parts.join(", ");
}

function freqSummaryPt(f: DraftFrequency, intervalHours: number | null): string {
  if (f === "as_needed") return "Quando precisar (SOS)";
  if (f === "interval_hours") return `A cada ${intervalHours ?? 8} horas`;
  if (f === "weekdays") return "Dias úteis";
  return "Todos os dias";
}

export default function MedicationReviewScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { patient } = usePatient();
  const { draft, setDraft } = useMedicationWizard();
  const { refresh } = useMedications();
  const [busy, setBusy] = useState(false);
  const displayNameInputRef = useRef<TextInput | null>(null);
  const notesInputRef = useRef<TextInput | null>(null);

  const displayName = draft.name.trim() || "Medicamento";
  const subtitle = formatDosageLine(draft);

  const timeRows = draft.schedules
    .slice()
    .sort((a, b) => a.hours * 60 + a.minutes - (b.hours * 60 + b.minutes))
    .map((s) => {
      const d = new Date();
      d.setHours(s.hours, s.minutes, 0, 0);
      return `${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ${s.quantity} aplicação${s.quantity > 1 ? "ões" : ""}`;
    })
    .join(" · ");

  async function save() {
    Keyboard.dismiss();
    if (!patient) {
      Alert.alert("Medicamento", "Complete o cadastro do paciente antes.");
      return;
    }
    setBusy(true);

    const first = draft.schedules[0];
    const anchorSource =
      draft.frequency === "interval_hours"
        ? combineDateTime(draft.startDate, first?.hours ?? 8, first?.minutes ?? 0)
        : combineDateTime(draft.startDate, first?.hours ?? 8, first?.minutes ?? 0);

    const dosageText =
      draft.dosageAmount?.trim() != null && draft.dosageAmount.trim().length > 0
        ? `${draft.dosageAmount.trim()}${draft.unit ? ` ${draft.unit}` : ""}`
        : null;

    const repeat_mode = repeatModeFromDraft(draft.frequency);
    const frequency_hours = Math.round(
      draft.frequency === "interval_hours" ? Math.min(168, Math.max(1, draft.intervalHours ?? 8)) : 24
    );

    const schedule_weekdays =
      draft.frequency === "weekdays" && draft.weekdays?.length ? draft.weekdays : null;

    const { data: inserted, error } = await supabase
      .from("medications")
      .insert({
        patient_id: patient.id,
        name: displayName,
        dosage: dosageText,
        form: draft.form,
        frequency_hours,
        anchor_at: anchorSource.toISOString(),
        end_date: draft.endDate ? toISODate(draft.endDate) : null,
        active: true,
        notes: draft.notes?.trim() || null,
        shape: draft.shapeId,
        color_left: draft.colorLeft,
        color_right: draft.colorRight,
        color_bg: draft.colorBg,
        unit: draft.unit,
        display_name: draft.displayName?.trim() || null,
        repeat_mode,
        schedule_weekdays,
      })
      .select(
        "id, patient_id, name, dosage, form, frequency_hours, anchor_at, end_date, active, notes, shape, color_left, color_right, color_bg, unit, display_name, pinned, repeat_mode, schedule_weekdays"
      )
      .single();

    if (error || !inserted) {
      setBusy(false);
      Alert.alert("Medicamento", error?.message ?? "Não foi possível guardar.");
      return;
    }

    if (repeat_mode !== "interval_hours" && draft.schedules.length > 0) {
      const rows = draft.schedules.map((s) => ({
        medication_id: inserted.id,
        time_of_day: scheduleItemToTimeOfDay(s),
        quantity: s.quantity,
      }));
      const { error: se } = await supabase.from("medication_schedules").insert(rows);
      if (se) {
        setBusy(false);
        Alert.alert("Medicamento", se.message ?? "Erro ao guardar horários.");
        return;
      }
    }

    const { data: slots } = await supabase.from("medication_schedules").select("id, time_of_day, quantity").eq("medication_id", inserted.id);

    setBusy(false);
    const full = { ...inserted, medication_schedules: slots ?? [] };
    await scheduleMedicationNotifications(full);
    await refresh();
    Alert.alert("Medicamento", "Guardado. Lembretes locais agendados quando aplicável.", [
      { text: "Concluir", onPress: () => router.replace("/(tabs)/health/medications" as Href) },
    ]);
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <KeyboardAccessoryDone label="Concluir" />
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
          Revise os detalhes
        </Text>
        <CircleChromeButton accessibilityLabel="Fechar" onPress={() => router.replace("/(tabs)/health/medications" as Href)}>
          <FontAwesome name="times" size={20} color={theme.colors.text.primary} />
        </CircleChromeButton>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <MedicationWizardStepBadge step={7} theme={theme} />
        <View style={{ alignItems: "center", marginTop: theme.spacing.sm }}>
          <PillPreview colorLeft={draft.colorLeft} colorRight={draft.colorRight} colorBg={draft.colorBg} size={120} />
        </View>

        <Text style={[theme.typography.largeTitle, { textAlign: "center", marginTop: theme.spacing.md }]}>{displayName}</Text>
        {subtitle ? (
          <Text style={[theme.typography.body, { textAlign: "center", color: theme.colors.text.secondary, marginTop: 4 }]}>
            {subtitle}
          </Text>
        ) : null}

        <Text style={[theme.typography.title2, { marginTop: theme.spacing.xl }]}>Horários</Text>
        <View
          style={{
            marginTop: theme.spacing.sm,
            backgroundColor: theme.colors.background.secondary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Text style={[theme.typography.headline]}>{freqSummaryPt(draft.frequency, draft.intervalHours)}</Text>
          {draft.frequency !== "interval_hours" && timeRows ? (
            <Text style={[theme.typography.body, { marginTop: theme.spacing.sm }]}>{timeRows}</Text>
          ) : draft.frequency === "interval_hours" && draft.schedules[0] ? (
            <Text style={[theme.typography.body, { marginTop: theme.spacing.sm }]}>
              A partir de{" "}
              {combineDateTime(draft.startDate, draft.schedules[0].hours, draft.schedules[0].minutes).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          ) : null}
          <View style={{ height: 1, backgroundColor: IOS_HEALTH.separator, marginVertical: theme.spacing.md }} />
          <Text style={{ color: theme.colors.text.secondary, fontSize: 15 }}>
            {draft.startDate.toDateString() === new Date().toDateString() ? "Começa hoje" : `Começa em ${draft.startDate.toLocaleDateString("pt-BR")}`}
          </Text>
        </View>

        <Text style={[theme.typography.title2, { marginTop: theme.spacing.lg }]}>Detalhes opcionais</Text>
        <TextInput
          ref={displayNameInputRef}
          value={draft.displayName ?? ""}
          onChangeText={(t) => setDraft({ displayName: t || null })}
          placeholder="Nome de exibição"
          placeholderTextColor={theme.colors.text.tertiary}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => notesInputRef.current?.focus()}
          inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
          style={{
            marginTop: theme.spacing.sm,
            backgroundColor: theme.colors.background.secondary,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.md,
            fontSize: 17,
            color: theme.colors.text.primary,
          }}
        />
        <TextInput
          ref={notesInputRef}
          value={draft.notes ?? ""}
          onChangeText={(t) => setDraft({ notes: t || null })}
          placeholder="Notas"
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          blurOnSubmit={false}
          inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
          style={{
            marginTop: theme.spacing.md,
            minHeight: 100,
            backgroundColor: theme.colors.background.secondary,
            borderRadius: theme.radius.md,
            paddingVertical: 14,
            paddingHorizontal: theme.spacing.md,
            fontSize: 17,
            color: theme.colors.text.primary,
            textAlignVertical: "top",
          }}
        />

        <Pressable
          disabled={busy}
          onPress={save}
          style={{
            marginTop: theme.spacing.xl,
            backgroundColor: IOS_HEALTH.blue,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>OK</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
