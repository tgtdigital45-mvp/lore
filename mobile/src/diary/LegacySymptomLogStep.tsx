import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { showAppToast } from "@/src/lib/appToast";
import { PAIN_REGIONS, type PainRegionId } from "@/src/diary/painRegions";
import {
  SYMPTOM_KEYS_OPTIONAL_PHOTO,
  symptomLabel,
  type SymptomDetailKey,
} from "@/src/diary/symptomCatalog";
import {
  VERBAL_SYMPTOM_LEVELS,
  type VerbalSymptomDbSeverity,
  type VerbalSymptomKey,
} from "@/src/diary/verbalSeverity";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
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

/** Uma única base temporal evita início e fim idênticos (dois `new Date()` separados no mount). */
function initialEpisodeRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  return { start, end };
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
    notes: string | null;
    photoUri: string | null;
  }) => void;
};

export function LegacySymptomLogStep({ theme, symptomKey, accent, onBack, busy, onSubmit }: Props) {
  const title = symptomLabel(symptomKey);
  const showOptionalPhoto = SYMPTOM_KEYS_OPTIONAL_PHOTO.has(symptomKey);
  const showPainRegion = symptomKey === "pain";

  const [verbal, setVerbal] = useState<VerbalSymptomKey>("present");
  const [episode, setEpisode] = useState(() => initialEpisodeRange());
  const startAt = episode.start;
  const endAt = episode.end;
  const [iosPicker, setIosPicker] = useState<PickerTarget | null>(null);
  const [androidPicker, setAndroidPicker] = useState<PickerTarget | null>(null);
  const [painRegion, setPainRegion] = useState<PainRegionId | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const verbalDb = (k: VerbalSymptomKey): VerbalSymptomDbSeverity => {
    const row = VERBAL_SYMPTOM_LEVELS.find((x) => x.key === k);
    return row!.db;
  };

  const openPicker = (which: "start" | "end", mode: "date" | "time") => {
    void Haptics.selectionAsync();
    if (Platform.OS === "android") {
      setAndroidPicker({ which, mode });
    } else {
      setIosPicker({ which, mode });
    }
  };

  const applyPickerDate = (current: PickerTarget, date: Date) => {
    setEpisode((prev) => {
      if (current.which === "start") {
        const next =
          current.mode === "date" ? mergeDatePart(prev.start, date) : mergeTimePart(prev.start, date);
        return { ...prev, start: next };
      }
      const next = current.mode === "date" ? mergeDatePart(prev.end, date) : mergeTimePart(prev.end, date);
      return { ...prev, end: next };
    });
  };

  const onIosPickerChange = (_: unknown, date?: Date) => {
    if (!date || !iosPicker) return;
    applyPickerDate(iosPicker, date);
  };

  const onAndroidPickerChange = (event: { type?: string }, date?: Date) => {
    const current = androidPicker;
    setAndroidPicker(null);
    if (event.type === "dismissed" || !date || !current) return;
    applyPickerDate(current, date);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAppToast("info", "Fotos", "Permita o acesso à galeria para anexar uma imagem.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) setPhotoUri(res.assets[0].uri);
  };

  const save = () => {
    const s = startAt.getTime();
    const e = endAt.getTime();
    if (e < s) {
      Alert.alert("Datas", "A hora de fim deve ser depois do início.");
      return;
    }
    const logged = new Date();
    let notes: string | null = null;
    if (showPainRegion && painRegion) {
      notes = JSON.stringify({ kind: "prd_meta", painRegion });
    }
    onSubmit({
      severity: verbalDb(verbal),
      symptom_started_at: startAt.toISOString(),
      symptom_ended_at: endAt.toISOString(),
      logged_at: logged.toISOString(),
      notes,
      photoUri: showOptionalPhoto ? photoUri : null,
    });
  };

  const activePicker = Platform.OS === "android" ? androidPicker : iosPicker;
  const pickerValue =
    activePicker?.which === "start" ? startAt : activePicker?.which === "end" ? endAt : new Date();

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}>
        <CircleChromeButton onPress={onBack} accessibilityLabel="Voltar">
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </CircleChromeButton>
      </View>
      <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{title}</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
        Por omissão: <Text style={{ fontWeight: "700" }}>termina agora</Text> e{" "}
        <Text style={{ fontWeight: "700" }}>começa 1 h antes</Text>. Ajuste data e hora em cada campo.
      </Text>

      {showPainRegion ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.sm }]}>
            Onde sente mais? (opcional)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {PAIN_REGIONS.map((r) => {
              const sel = painRegion === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setPainRegion(sel ? null : r.id);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.background.primary,
                    borderWidth: sel ? 2 : 1,
                    borderColor: sel ? accent : theme.colors.border.divider,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.colors.text.primary }}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {showOptionalPhoto ? (
        <Pressable
          onPress={() => void pickPhoto()}
          style={{
            marginTop: theme.spacing.lg,
            paddingVertical: 12,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.background.primary,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border.divider,
          }}
        >
          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>
            {photoUri ? "Foto anexada (tocar para alterar)" : "Anexar foto (opcional)"}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            Útil para alterações de pele ou lesões — fica no dossier da equipe.
          </Text>
        </Pressable>
      ) : null}

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

      {Platform.OS === "ios" && iosPicker ? (
        <>
          <DateTimePicker value={pickerValue} mode={iosPicker.mode} display="spinner" onChange={onIosPickerChange} />
          <Pressable onPress={() => setIosPicker(null)} style={{ marginTop: theme.spacing.sm, alignSelf: "center" }}>
            <Text style={{ color: accent, fontWeight: "600" }}>Fechar seletor</Text>
          </Pressable>
        </>
      ) : null}

      {Platform.OS === "android" && androidPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode={androidPicker.mode}
          display="default"
          onChange={onAndroidPickerChange}
        />
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
