import { type ReactNode, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useStackBack } from "@/src/hooks/useStackBack";
import { TREATMENT_HREF } from "@/src/navigation/treatmentRoutes";
import type { AppTheme } from "@/src/theme/theme";

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const INTERVAL_PRESETS = [7, 14, 21] as const;

function SectionCard({
  theme,
  title,
  icon,
  subtitle,
  children,
}: {
  theme: AppTheme;
  title: string;
  icon: keyof typeof FontAwesome.glyphMap;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          marginBottom: subtitle ? theme.spacing.xs : theme.spacing.md,
        }}
      >
        <FontAwesome name={icon} size={20} color={IOS_HEALTH.blue} />
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, flex: 1 }]}>{title}</Text>
      </View>
      {subtitle ? (
        <Text style={[theme.typography.caption1, { color: theme.colors.text.tertiary, marginBottom: theme.spacing.md }]}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export default function TreatmentScheduleWizardScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const goBack = useStackBack(TREATMENT_HREF.kind);
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const treatmentKind = typeof kind === "string" && kind.length > 0 ? kind : "other";

  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [planned, setPlanned] = useState("");
  const [completed, setCompleted] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const completedRef = useRef<TextInput>(null);
  const intervalRef = useRef<TextInput>(null);

  const canNext = (() => {
    const p = planned.trim();
    if (p.length === 0) return false;
    const pn = parseInt(p, 10);
    if (!Number.isFinite(pn) || pn < 1) return false;
    const c = completed.trim();
    if (c.length > 0) {
      const cn = parseInt(c, 10);
      if (!Number.isFinite(cn) || cn < 0 || cn > pn) return false;
    }
    const iv = intervalDays.trim();
    if (pn > 1) {
      if (iv.length === 0) return false;
      const idn = parseInt(iv, 10);
      if (!Number.isFinite(idn) || idn < 1 || idn > 180) return false;
    } else if (iv.length > 0) {
      const idn = parseInt(iv, 10);
      if (!Number.isFinite(idn) || idn < 1 || idn > 180) return false;
    }
    return true;
  })();

  function next() {
    if (!canNext) return;
    Keyboard.dismiss();
    router.push({
      pathname: TREATMENT_HREF.details,
      params: {
        kind: treatmentKind,
        startDate: toDateOnly(start),
        planned: planned.trim(),
        completed: completed.trim(),
        infusionIntervalDays: intervalDays.trim(),
      },
    });
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
        <CircleChromeButton accessibilityLabel="Voltar" onPress={goBack}>
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </CircleChromeButton>
        <Text style={[theme.typography.headline, { flex: 1, textAlign: "center", color: theme.colors.text.primary }]}>
          Datas e sessões
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <KeyboardAccessoryDone />

        <SectionCard
          theme={theme}
          title="Início do ciclo"
          icon="calendar"
          subtitle="Data em que o protocolo começa a contar para o planejamento."
        >
          {Platform.OS === "ios" ? (
            <DateTimePicker value={start} mode="date" display="spinner" onChange={(_, d) => d && setStart(d)} />
          ) : (
            <>
              <Pressable onPress={() => setShowPicker(true)} style={{ marginBottom: theme.spacing.sm }}>
                <Text style={[theme.typography.body, { color: theme.colors.text.primary, fontWeight: "600" }]}>
                  {start.toLocaleDateString("pt-BR")}
                </Text>
              </Pressable>
              {showPicker ? (
                <DateTimePicker
                  value={start}
                  mode="date"
                  display="default"
                  onChange={(e, d) => {
                    setShowPicker(Platform.OS === "ios");
                    if (d) setStart(d);
                  }}
                />
              ) : null}
            </>
          )}
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Quantidade de sessões"
          icon="list-ol"
          subtitle="O app cria um check-in por sessão. Indique pelo menos 1."
        >
          <TextInput
            value={planned}
            onChangeText={setPlanned}
            placeholder="Ex.: 4"
            keyboardType="number-pad"
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => completedRef.current?.focus()}
            placeholderTextColor={theme.colors.text.tertiary}
            style={{
              marginTop: theme.spacing.xs,
              backgroundColor: theme.colors.background.primary,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              paddingVertical: 14,
              paddingHorizontal: theme.spacing.md,
              fontSize: 17,
              color: theme.colors.text.primary,
            }}
          />
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Infusões já realizadas"
          icon="check-circle"
          subtitle="Número aproximado antes de registrar o histórico detalhado. Opcional."
        >
          <TextInput
            ref={completedRef}
            value={completed}
            onChangeText={setCompleted}
            placeholder="Ex.: 2"
            keyboardType="number-pad"
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => intervalRef.current?.focus()}
            placeholderTextColor={theme.colors.text.tertiary}
            style={{
              marginTop: theme.spacing.xs,
              backgroundColor: theme.colors.background.primary,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              paddingVertical: 14,
              paddingHorizontal: theme.spacing.md,
              fontSize: 17,
              color: theme.colors.text.primary,
            }}
          />
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Dias entre infusões"
          icon="refresh"
          subtitle={
            planned.trim() !== "" && parseInt(planned, 10) > 1
              ? "Obrigatório com mais de uma sessão — usamos para a data prevista de cada check-in."
              : "Opcional com uma sessão. Com várias, o intervalo é obrigatório."
          }
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
            {INTERVAL_PRESETS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setIntervalDays(String(d))}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor: intervalDays.trim() === String(d) ? IOS_HEALTH.blue : theme.colors.background.primary,
                }}
              >
                <Text
                  style={{ color: intervalDays.trim() === String(d) ? "#FFFFFF" : theme.colors.text.primary, fontWeight: "600" }}
                >
                  {d} d
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            ref={intervalRef}
            value={intervalDays}
            onChangeText={setIntervalDays}
            placeholder="Outro (1–180 dias)"
            keyboardType="number-pad"
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
            placeholderTextColor={theme.colors.text.tertiary}
            style={{
              marginTop: theme.spacing.sm,
              backgroundColor: theme.colors.background.primary,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              paddingVertical: 14,
              paddingHorizontal: theme.spacing.md,
              fontSize: 17,
              color: theme.colors.text.primary,
            }}
          />
        </SectionCard>

        <Pressable
          disabled={!canNext}
          onPress={next}
          style={({ pressed }) => ({
            marginTop: theme.spacing.sm,
            backgroundColor: canNext ? IOS_HEALTH.blue : theme.colors.background.tertiary,
            paddingVertical: 14,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            alignItems: "center",
            opacity: pressed && canNext ? 0.88 : 1,
          })}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#FFFFFF" }}>Seguinte</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
