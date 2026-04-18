import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { useMedicationWizard } from "@/src/medications/MedicationWizardContext";
import { MedicationWizardStepBadge } from "@/src/medications/components/MedicationWizardStepBadge";
import { ScheduleRow } from "@/src/medications/components/ScheduleRow";
import { INTERVAL_HOUR_OPTIONS } from "@/src/medications/constants";
import type { DraftFrequency, ScheduleItem } from "@/src/medications/types";
import { PillPreview } from "@/src/medications/components/PillPreview";
import { formatDosageLine } from "@/src/medications/medicationFormatters";

function freqDisplayText(d: { frequency: DraftFrequency; intervalHours: number | null }): string {
  if (d.frequency === "as_needed") return "Quando precisar (SOS)";
  if (d.frequency === "interval_hours") return `A cada ${d.intervalHours ?? 8} horas`;
  if (d.frequency === "weekdays") return "Dias úteis (seg–sex)";
  return "Todos os dias";
}

function newId() {
  return Math.random().toString(36).slice(2, 11);
}

export default function MedicationScheduleScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack("/(tabs)/health/medications" as Href);
  const { draft, setDraft } = useMedicationWizard();

  const [freqOpen, setFreqOpen] = useState(false);
  const [durOpen, setDurOpen] = useState(false);

  const displayName = draft.name.trim() || "Medicamento";
  const subtitle = formatDosageLine(draft);

  useFocusEffect(
    useCallback(() => {
      setDraft((d) => {
        if (d.schedules.length > 0) return d;
        const now = new Date();
        const m = Math.round(now.getMinutes() / 15) * 15;
        const adj = new Date(now);
        adj.setMinutes(m % 60, 0, 0);
        if (m >= 60) adj.setHours(adj.getHours() + 1);
        return {
          ...d,
          schedules: [
            {
              clientId: newId(),
              hours: adj.getHours(),
              minutes: adj.getMinutes(),
              quantity: 1,
            },
          ],
        };
      });
    }, [setDraft])
  );

  const isInterval = draft.frequency === "interval_hours";
  const isAsNeeded = draft.frequency === "as_needed";

  const setFrequency = (f: DraftFrequency) => {
    setDraft((d) => {
      let schedules = d.schedules;
      if (f === "interval_hours") {
        const first =
          schedules[0] ??
          ({
            clientId: newId(),
            hours: new Date().getHours(),
            minutes: Math.round(new Date().getMinutes() / 15) * 15 % 60,
            quantity: 1,
          } satisfies ScheduleItem);
        schedules = [first];
      }
      if (f === "as_needed") {
        schedules = [];
      }
      return {
        ...d,
        frequency: f,
        weekdays: f === "weekdays" ? [1, 2, 3, 4, 5] : null,
        intervalHours: f === "interval_hours" ? d.intervalHours ?? 8 : d.intervalHours,
        schedules,
      };
    });
    setFreqOpen(false);
  };

  const updateRow = (clientId: string, next: ScheduleItem) => {
    setDraft((d) => ({
      ...d,
      schedules: d.schedules.map((s) => (s.clientId === clientId ? next : s)),
    }));
  };

  const removeRow = (clientId: string) => {
    setDraft((d) => {
      if (d.frequency === "interval_hours" && d.schedules.length <= 1) return d;
      return {
        ...d,
        schedules: d.schedules.filter((s) => s.clientId !== clientId),
      };
    });
  };

  const addRow = () => {
    const now = new Date();
    setDraft((d) => ({
      ...d,
      schedules: [
        ...d.schedules,
        {
          clientId: newId(),
          hours: now.getHours(),
          minutes: now.getMinutes(),
          quantity: 1,
        },
      ],
    }));
  };

  const canNext = useMemo(() => {
    if (isAsNeeded) return true;
    if (isInterval) {
      return (draft.intervalHours ?? 0) > 0 && draft.schedules.length > 0;
    }
    return draft.schedules.length > 0;
  }, [draft.intervalHours, draft.schedules.length, isInterval, isAsNeeded]);

  const goReview = () => {
    if (!canNext) {
      Alert.alert("Horários", isInterval ? "Defina o intervalo e um horário de referência." : "Adicione pelo menos um horário.");
      return;
    }
    router.push("/(tabs)/health/medications/review" as Href);
  };

  const startLabel = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const d0 = new Date(draft.startDate);
    d0.setHours(0, 0, 0, 0);
    const isToday = d0.getTime() === t.getTime();
    return `${draft.startDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}${isToday ? " (Hoje)" : ""}`;
  }, [draft.startDate]);

  const endLabel = draft.endDate
    ? draft.endDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
    : "Nenhuma";

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
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: theme.colors.text.primary,
              letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 2 }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <CircleChromeButton accessibilityLabel="Fechar" onPress={() => router.replace("/(tabs)/health/medications" as Href)}>
          <FontAwesome name="times" size={20} color={theme.colors.text.primary} />
        </CircleChromeButton>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
      >
        <MedicationWizardStepBadge step={6} theme={theme} />
        <View style={{ alignItems: "center", marginTop: theme.spacing.xs }}>
          <PillPreview colorLeft={draft.colorLeft} colorRight={draft.colorRight} colorBg={draft.colorBg} size={72} />
        </View>

        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
          Defina horários
        </Text>

        <View
          style={{
            marginTop: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.colors.background.secondary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>SOS (só quando precisar)</Text>
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: 4 }}>
              Sem horários fixos nem lembretes por hora. O medicamento fica em «Seus medicamentos» como uso esporádico.
            </Text>
          </View>
          <Switch
            value={isAsNeeded}
            onValueChange={(on) => {
              if (on) setFrequency("as_needed");
              else setFrequency("daily");
            }}
          />
        </View>

        <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.md }]}>
          Quando você tomará?
        </Text>
        <Pressable
          onPress={() => setFreqOpen(true)}
          style={{
            marginTop: theme.spacing.sm,
            backgroundColor: theme.colors.background.secondary,
            borderRadius: IOS_HEALTH.groupedListRadius,
            padding: theme.spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Text style={[theme.typography.body, { fontWeight: "600" }]}>{freqDisplayText(draft)}</Text>
          <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Alterar</Text>
        </Pressable>

        {isAsNeeded ? (
          <View
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: theme.colors.background.secondary,
              borderRadius: IOS_HEALTH.groupedListRadius,
              padding: theme.spacing.md,
              ...IOS_HEALTH.shadow.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#FF9500",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome name="bell-o" size={20} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
                  Modo SOS ativo
                </Text>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                  Após guardar, encontra o medicamento em «Seus medicamentos» e regista tomas quando usar.
                </Text>
              </View>
            </View>
          </View>
        ) : !isInterval ? (
          <>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
              Que horas?
            </Text>
            <View
              style={{
                marginTop: theme.spacing.sm,
                backgroundColor: theme.colors.background.secondary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                paddingHorizontal: theme.spacing.md,
                overflow: "hidden",
                ...IOS_HEALTH.shadow.card,
              }}
            >
              {draft.schedules.map((s) => (
                <ScheduleRow
                  key={s.clientId}
                  item={s}
                  onChange={(next) => updateRow(s.clientId, next)}
                  onRemove={() => removeRow(s.clientId)}
                />
              ))}
              <Pressable
                onPress={addRow}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: theme.spacing.md,
                  gap: theme.spacing.sm,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#34C759",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome name="plus" size={12} color="#FFF" />
                </View>
                <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Adicione um horário</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary, marginTop: theme.spacing.sm }}>
              Se você agendar um horário, o Aura enviará uma notificação local para lembrar a dose.
            </Text>
          </>
        ) : (
          <>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
              A cada quantas horas?
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
              {INTERVAL_HOUR_OPTIONS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setDraft({ intervalHours: h })}
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    backgroundColor:
                      draft.intervalHours === h ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>{h} h</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
              Primeira dose (referência)
            </Text>
            {draft.schedules[0] ? (
              <View
                style={{
                  marginTop: theme.spacing.sm,
                  backgroundColor: theme.colors.background.secondary,
                  borderRadius: IOS_HEALTH.groupedListRadius,
                  paddingHorizontal: theme.spacing.md,
                  ...IOS_HEALTH.shadow.card,
                }}
              >
                <ScheduleRow
                  item={draft.schedules[0]}
                  onChange={(next) => updateRow(draft.schedules[0].clientId, next)}
                  onRemove={() => {}}
                  doseLabel="referência"
                  showRemove={false}
                />
              </View>
            ) : null}
          </>
        )}

        {!isAsNeeded && (
          <>
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
              Duração
            </Text>
            <View
              style={{
                marginTop: theme.spacing.sm,
                backgroundColor: theme.colors.background.secondary,
                borderRadius: IOS_HEALTH.groupedListRadius,
                padding: theme.spacing.md,
                ...IOS_HEALTH.shadow.card,
              }}
            >
              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.text.secondary, fontWeight: "600" }}>DATA DE INÍCIO</Text>
                  <Text style={[theme.typography.body, { marginTop: 4 }]}>{startLabel}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.text.secondary, fontWeight: "600" }}>DATA DO TÉRMINO</Text>
                  <Text style={[theme.typography.body, { marginTop: 4 }]}>{endLabel}</Text>
                </View>
              </View>
              <Pressable onPress={() => setDurOpen(true)} style={{ marginTop: theme.spacing.md }}>
                <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Editar</Text>
              </Pressable>
            </View>
          </>
        )}

        <Pressable
          disabled={!canNext}
          onPress={goReview}
          style={{
            marginTop: theme.spacing.xl,
            backgroundColor: canNext ? IOS_HEALTH.blue : theme.colors.background.tertiary,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
          }}
        >
          <Text style={[theme.typography.headline, { color: canNext ? "#FFFFFF" : theme.colors.text.tertiary }]}>
            Seguinte
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={freqOpen} transparent animationType="fade" onRequestClose={() => setFreqOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setFreqOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.colors.background.primary,
              borderTopLeftRadius: theme.radius.lg,
              borderTopRightRadius: theme.radius.lg,
              padding: theme.spacing.lg,
            }}
          >
            <Text style={[theme.typography.title2, { marginBottom: theme.spacing.md }]}>Frequência</Text>
            {(
              [
                ["daily", "Todos os dias"],
                ["weekdays", "Dias úteis (seg–sex)"],
                ["interval_hours", "A cada X horas"],
                ["as_needed", "Quando precisar (SOS)"],
              ] as const
            ).map(([val, label]) => (
              <Pressable
                key={val}
                onPress={() => setFrequency(val as DraftFrequency)}
                style={{ paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: IOS_HEALTH.separator }}
              >
                <Text style={theme.typography.body}>{label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setFreqOpen(false)} style={{ paddingVertical: theme.spacing.md, alignItems: "center" }}>
              <Text style={{ color: IOS_HEALTH.destructive, fontWeight: "600" }}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={durOpen} transparent animationType="fade" onRequestClose={() => setDurOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: theme.spacing.lg }} onPress={() => setDurOpen(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: theme.colors.background.primary, borderRadius: theme.radius.lg, padding: theme.spacing.md }}>
            <Text style={[theme.typography.title2, { marginBottom: theme.spacing.sm }]}>Datas</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Início</Text>
            <DateTimePicker
              value={draft.startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                if (date) setDraft({ startDate: date });
              }}
            />
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>Término (opcional)</Text>
            <DateTimePicker
              value={draft.endDate ?? draft.startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                if (date) setDraft({ endDate: date });
              }}
            />
            <Pressable onPress={() => setDraft({ endDate: null })} style={{ marginTop: theme.spacing.sm }}>
              <Text style={{ color: IOS_HEALTH.blue, fontWeight: "600" }}>Sem data de término</Text>
            </Pressable>
            <Pressable onPress={() => setDurOpen(false)} style={{ marginTop: theme.spacing.lg, alignItems: "center" }}>
              <Text style={[theme.typography.headline, { color: IOS_HEALTH.blue }]}>OK</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ResponsiveScreen>
  );
}
