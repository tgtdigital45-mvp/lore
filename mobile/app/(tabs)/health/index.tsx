import { useCallback } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { HealthRow } from "@/src/health/components/HealthRow";
import { HealthSection } from "@/src/health/components/HealthSection";
import { useAppTheme } from "@/src/hooks/useAppTheme";

type Cat = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  tint: string;
  href?: Href;
};

const MAIN_CATEGORIES: Cat[] = [
  { key: "treatment", label: "Tratamento", icon: "circle-o", tint: "#FF2D55", href: "/(tabs)/health/treatment" as Href },
  { key: "meds", label: "Medicamentos", icon: "medkit", tint: "#32ADE6", href: "/(tabs)/health/medications" as Href },
  { key: "vitals", label: "Sinais vitais", icon: "heartbeat", tint: "#FF2D55", href: "/(tabs)/health/vitals" as Href },
  { key: "nutrition", label: "Nutrição", icon: "cutlery", tint: "#34C759", href: "/(tabs)/health/nutrition" as Href },
  { key: "exams", label: "Exames", icon: "file-text-o", tint: "#5E5CE6", href: "/(tabs)/exams" as Href },
  { key: "diary", label: "Sintomas", icon: "book", tint: "#AF52DE", href: "/(tabs)/health/diary" as Href },
  { key: "calendar", label: "Agendamentos", icon: "calendar", tint: "#007AFF", href: "/calendar" as Href },
];

export default function HealthBrowseScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const onCategory = useCallback(
    (c: Cat) => {
      if (c.href) router.push(c.href);
    },
    [router]
  );

  return (
    <ResponsiveScreen variant="tabGradient">
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
          <Text
            style={[
              theme.typography.largeTitle,
              { color: theme.colors.text.primary, letterSpacing: Platform.OS === "ios" ? 0.35 : 0 },
            ]}
          >
            Buscar
          </Text>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              lineHeight: 22,
              color: theme.colors.text.primary,
              marginTop: theme.spacing.md,
            }}
          >
            Categorias de Saúde
          </Text>
        </View>

        <HealthSection theme={theme} title="" marginTop={0} surfaceColor={theme.colors.background.primary}>
          {MAIN_CATEGORIES.map((c, i) => (
            <HealthRow
              key={c.key}
              theme={theme}
              icon={c.icon}
              iconTint={c.tint}
              title={c.label}
              showDivider={i < MAIN_CATEGORIES.length - 1}
              onPress={() => onCategory(c)}
            />
          ))}
        </HealthSection>
      </ScrollView>
    </ResponsiveScreen>
  );
}
