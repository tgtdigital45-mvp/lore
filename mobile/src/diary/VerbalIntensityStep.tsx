import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";
import { VERBAL_SYMPTOM_LEVELS, type VerbalSymptomKey } from "@/src/diary/verbalSeverity";
import type { AppTheme } from "@/src/theme/theme";

type Props = {
  theme: AppTheme;
  title: string;
  subtitle?: string;
  value: VerbalSymptomKey;
  onChange: (k: VerbalSymptomKey) => void;
  accent: string;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
};

export function VerbalIntensityStep({
  theme,
  title,
  subtitle,
  value,
  onChange,
  accent,
  onBack,
  onSubmit,
  submitLabel = "Registrar",
  busy,
}: Props) {
  return (
    <View>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
      >
        <Text style={{ fontSize: 22, color: accent, fontWeight: "600" }}>‹</Text>
        <Text style={[theme.typography.body, { color: accent, marginLeft: 4 }]}>Voltar</Text>
      </Pressable>
      <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
          {subtitle}
        </Text>
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
          const sel = value === row.key;
          return (
            <Pressable
              key={row.key}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(row.key);
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

      <Pressable
        onPress={onSubmit}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        style={{
          marginTop: theme.spacing.xl,
          backgroundColor: accent,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.radius.lg,
          alignItems: "center",
          opacity: busy ? 0.55 : 1,
        }}
      >
        <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}
