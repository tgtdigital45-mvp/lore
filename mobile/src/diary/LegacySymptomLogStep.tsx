import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import {
  VERBAL_SYMPTOM_LEVELS,
  type VerbalSymptomDbSeverity,
  type VerbalSymptomKey,
} from "@/src/diary/verbalSeverity";
import { symptomLabel, type SymptomDetailKey } from "@/src/diary/symptomCatalog";
import type { AppTheme } from "@/src/theme/theme";

type PickerTarget = { which: "start" | "end"; mode: "date" | "time" };

function formatDatePt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTimePt(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

function mergeDatePart(base: Date, from: Date): Date {
  const o = new Date(base);
  o.setFullYear(from.getFullYear(), from.getMonth(), from.getDate());
  return o;
}

function mergeTimePart(base: Date, from: Date): Date {
  const o = new Date(base);
  o.setHours(from.getHours(), from.getMinutes(), 0, 0);
  return o;
}

type Props = {
  theme: AppTheme;
  symptomKey: SymptomDetailKey;
  accent: string;
  onBack: () => void;
  busy: boolean;
  onSubmit: (payload: {
    severity: VerbalSymptomDbSeverity;
    symptom_started_at: string;
    symptom_ended_at: string;
    logged_at: string;
  }) => void;
};

export function LegacySymptomLogStep({ theme, symptomKey, accent, onBack, busy, onSubmit }: Props) {
  const title = symptomLabel(symptomKey);
  const [verbal, setVerbal] = useState<VerbalSymptomKey>("present");
  const [startAt, setStartAt] = useState(() => new Date());
  const [endAt, setEndAt] = useState(() => new Date());
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  const verbalDb = (k: VerbalSymptomKey): VerbalSymptomDbSeverity => {
    const row = VERBAL_SYMPTOM_LEVELS.find((x) => x.key === k);
    return row!.db;
  };

  const openPicker = (which: "start" | "end", mode: "date" | "time") => {
    void Haptics.selectionAsync();
    setPicker({ which, mode });
  };

  const onPickerChange = (_: unknown, date?: Date) => {
    const current = picker;
    if (Platform.OS === "android") {
      setPicker(null);
    }
    if (!date || !current) return;
    if (current.which === "start") {
      setStartAt((prev) => (current.mode === "date" ? mergeDatePart(prev, date) : mergeTimePart(prev, date)));
    } else {
      setEndAt((prev) => (current.mode === "date" ? mergeDatePart(prev, date) : mergeTimePart(prev, date)));
    }
  };

  const save = () => {
    const s = startAt.getTime();
    const e = endAt.getTime();
    if (e < s) {
      Alert.alert("Datas", "A hora de fim deve ser depois do início.");
      return;
    }
    const logged = new Date();
    onSubmit({
      severity: verbalDb(verbal),
      symptom_started_at: startAt.toISOString(),
      symptom_ended_at: endAt.toISOString(),
      logged_at: logged.toISOString(),
    });
  };

  const pickerValue =
    picker?.which === "start" ? startAt : picker?.which === "end" ? endAt : new Date();

  return (
    <View>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
      >
        <Text style={{ fontSize: 22, color: accent, fontWeight: "600" }}>‹</Text>
        <Text style={[theme.typography.body, { color: accent, marginLeft: 4 }]}>Voltar</Text>
      </Pressable>
      <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{title}</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
        Sugestão: agora — ajuste o período em que sentiu o sintoma.
      </Text>

      <View
        style={{
          marginTop: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          backgroundColor: theme.colors.background.primary,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border.divider,
        }}
      >
        {VERBAL_SYMPTOM_LEVELS.map((row, index) => {
          const sel = verbal === row.key;
          return (
            <Pressable
              key={row.key}
              onPress={() => {
                void Haptics.selectionAsync();
                setVerbal(row.key);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: theme.spacing.md,
                borderBottomWidth: index < VERBAL_SYMPTOM_LEVELS.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: theme.colors.border.divider,
              }}
            >
              <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: theme.colors.text.primary }}>
                {row.label}
              </Text>
              {sel ? <FontAwesome name="check" size={18} color={accent} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={[{ fontSize: 13, fontWeight: "600" as const, color: theme.colors.text.secondary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm }]}>
        COMEÇA
      </Text>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Pressable
          onPress={() => openPicker("start", "date")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
          }}
        >
          <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>{formatDatePt(startAt)}</Text>
          <FontAwesome name="calendar" size={16} color={theme.colors.text.tertiary} />
        </Pressable>
        <Pressable
          onPress={() => openPicker("start", "time")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
          }}
        >
          <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>{formatTimePt(startAt)}</Text>
          <MaterialIcons name="access-time" size={18} color={theme.colors.text.tertiary} />
        </Pressable>
      </View>

      <Text style={[{ fontSize: 13, fontWeight: "600" as const, color: theme.colors.text.secondary, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }]}>
        TERMINA
      </Text>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Pressable
          onPress={() => openPicker("end", "date")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
          }}
        >
          <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>{formatDatePt(endAt)}</Text>
          <FontAwesome name="calendar" size={16} color={theme.colors.text.tertiary} />
        </Pressable>
        <Pressable
          onPress={() => openPicker("end", "time")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            paddingHorizontal: theme.spacing.md,
            backgroundColor: theme.colors.background.tertiary,
            borderRadius: theme.radius.md,
          }}
        >
          <Text style={{ color: theme.colors.text.primary, fontWeight: "600" }}>{formatTimePt(endAt)}</Text>
          <MaterialIcons name="access-time" size={18} color={theme.colors.text.tertiary} />
        </Pressable>
      </View>

      {picker ? (
        <DateTimePicker
          value={pickerValue}
          mode={picker.mode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === "ios" && picker ? (
        <Pressable
          onPress={() => setPicker(null)}
          style={{ marginTop: theme.spacing.sm, alignSelf: "center" }}
        >
          <Text style={{ color: accent, fontWeight: "600" }}>Fechar seletor</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={save}
        disabled={busy}
        style={{
          marginTop: theme.spacing.xl,
          backgroundColor: accent,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.lg,
          alignItems: "center",
          opacity: busy ? 0.55 : 1,
        }}
      >
        <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Registrar</Text>
      </Pressable>
    </View>
  );
}
