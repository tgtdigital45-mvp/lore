import { useCallback } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { HealthHeroCard } from "@/src/health/components/HealthHeroCard";
import { HealthRow } from "@/src/health/components/HealthRow";
import { HealthSection } from "@/src/health/components/HealthSection";
import { AppleHealthVitalsSection } from "@/src/health/AppleHealthVitalsSection";
import { canUseAppleHealthKit } from "@/src/health/appleHealthEnv";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { useHealthKitReadiness } from "@/src/health/useHealthKitReadiness";
import { useAppTheme } from "@/src/hooks/useAppTheme";

type Cat = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  tint: string;
  href?: Href;
};

const MAIN_CATEGORIES: Cat[] = [
  { key: "treatment", label: "Tratamento", icon: "circle-o", tint: "#FF2D55", href: "/(tabs)/treatment" as Href },
  { key: "meds", label: "Medicamentos", icon: "medkit", tint: "#32ADE6", href: "/(tabs)/health/medications" as Href },
  { key: "vitals", label: "Sinais vitais", icon: "heartbeat", tint: "#FF2D55", href: "/(tabs)/health/vitals" as Href },
  { key: "nutrition", label: "Nutrição", icon: "cutlery", tint: "#34C759", href: "/(tabs)/health/nutrition" as Href },
  { key: "exams", label: "Exames", icon: "file-text-o", tint: "#5E5CE6", href: "/(tabs)/exams" as Href },
  { key: "diary", label: "Diário e sintomas", icon: "book", tint: "#AF52DE", href: "/(tabs)/diary" as Href },
  { key: "calendar", label: "Agendamentos", icon: "calendar", tint: "#007AFF", href: "/calendar" as Href },
];

export default function HealthBrowseScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const hk = useHealthKitReadiness();

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

        <HealthSection theme={theme} title="" surfaceColor={theme.colors.background.primary}>
          <HealthRow
            theme={theme}
            icon="file-text-o"
            iconTint={IOS_HEALTH.blue}
            title="Documentos clínicos"
            subtitle="Exames e laudos no Onco"
            showDivider={false}
            onPress={() => router.push("/(tabs)/exams/index" as Href)}
          />
        </HealthSection>

        <View
          style={{
            marginTop: theme.spacing.lg,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.colors.background.primary,
            borderRadius: IOS_HEALTH.pillButtonRadius,
            paddingVertical: 12,
            paddingHorizontal: theme.spacing.md,
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <FontAwesome name="search" size={18} color={theme.colors.text.secondary} />
          <Text style={{ flex: 1, marginLeft: theme.spacing.sm, fontSize: 17, color: theme.colors.text.tertiary }}>
            Buscar
          </Text>
          <FontAwesome name="microphone" size={18} color={theme.colors.text.secondary} />
        </View>

        <HealthHeroCard
          theme={theme}
          ringTrackColor={theme.colors.border.divider}
          title="Movimento e energia"
          subtitle="Integração com Apple Saúde e anéis de atividade quando o HealthKit estiver ligado."
          footnote={
            hk.platformSupported
              ? hk.nativeLinked
                ? "Apple Saúde: leitura de vitais ativa neste build."
                : "Gere um build iOS nativo para ligar o Apple Saúde (não disponível no Expo Go)."
              : "Android: Health Connect planejado."
          }
        />

        <HealthSection theme={theme} title="Destaques" surfaceColor={theme.colors.background.primary}>
          {canUseAppleHealthKit() ? (
            <AppleHealthVitalsSection theme={theme} />
          ) : (
            <>
              <HealthRow
                theme={theme}
                icon="heartbeat"
                iconTint={theme.colors.semantic.vitals}
                title="Frequência cardíaca"
                subtitle={hk.platformSupported ? "Build iOS com HealthKit" : "Em breve"}
                value="—"
                showDivider
              />
              <HealthRow
                theme={theme}
                icon="tint"
                iconTint={theme.colors.semantic.respiratory}
                title="Oxigênio no sangue"
                subtitle={hk.platformSupported ? "Build iOS com HealthKit" : "Em breve"}
                value="—"
                showDivider
              />
              <HealthRow
                theme={theme}
                icon="area-chart"
                iconTint={theme.colors.semantic.vitals}
                title="Variabilidade cardíaca (VFC)"
                subtitle={hk.platformSupported ? "Build iOS com HealthKit" : "Em breve"}
                value="—"
                showDivider
              />
              <HealthRow
                theme={theme}
                icon="ambulance"
                iconTint={theme.colors.semantic.vitals}
                title="Quedas (Apple Saúde)"
                subtitle={hk.platformSupported ? "Build iOS com HealthKit" : "Em breve"}
                value="—"
                showDivider
              />
              <HealthRow
                theme={theme}
                icon="warning"
                iconTint={theme.colors.semantic.symptoms}
                title="Estabilidade ao caminhar"
                subtitle={hk.platformSupported ? "Build iOS com HealthKit" : "Em breve"}
                value="—"
                showDivider={false}
              />
            </>
          )}
        </HealthSection>

        <HealthSection
          theme={theme}
          title="Privacidade e dados"
          surfaceColor={theme.colors.background.primary}
          footer="Os dados clínicos e as amostras Apple Saúde (vitais, quedas, estabilidade) seguem RLS no Supabase; lembretes de medicamentos seguirão a mesma postura quando ativos."
        >
          <HealthRow
            theme={theme}
            icon="lock"
            iconTint={IOS_HEALTH.destructive}
            title="Criptografia"
            subtitle="Como no app Saúde, informações sensíveis exigem o seu consentimento explícito para compartilhar."
            showDivider
          />
          <HealthRow
            theme={theme}
            icon="apple"
            iconTint={theme.colors.text.primary}
            title="Apple Saúde"
            subtitle={hk.message}
            showDivider={false}
          />
        </HealthSection>
      </ScrollView>
    </ResponsiveScreen>
  );
}
