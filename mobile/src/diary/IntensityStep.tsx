import { Pressable, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import type { AppTheme } from "@/src/theme/theme";

type Props = {
  theme: AppTheme;
  title: string;
  subtitle?: string;
  value: number;
  onChange: (n: number) => void;
  accent: string;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
};

/** Um passo: título + número grande + slider 0–10 (rápido, estilo Saúde). */
export function IntensityStep({
  theme,
  title,
  subtitle,
  value,
  onChange,
  accent,
  onBack,
  onSubmit,
  submitLabel = "Registar",
  busy,
}: Props) {
  const v = Math.round(value);
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
      <View style={{ alignItems: "center", marginTop: theme.spacing.xl, marginBottom: theme.spacing.lg }}>
        <Text style={[theme.typography.dataHuge, { color: theme.colors.text.primary }]}>{v}</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
          de 10
        </Text>
      </View>
      <Slider
        style={{ width: "100%", height: 48 }}
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={(n) => {
          onChange(n);
          void Haptics.selectionAsync();
        }}
        onSlidingComplete={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        minimumTrackTintColor={accent}
        maximumTrackTintColor={theme.colors.background.tertiary}
        thumbTintColor={accent}
      />
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.xs }}>
        <Text style={{ fontSize: 13, color: theme.colors.text.tertiary }}>Nenhum</Text>
        <Text style={{ fontSize: 13, color: theme.colors.text.tertiary }}>Máximo</Text>
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
