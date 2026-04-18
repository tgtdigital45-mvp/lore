import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { ScreenLoading } from "@/src/components/ScreenLoading";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useConsent } from "@/src/hooks/useConsent";
import { usePatient } from "@/src/hooks/usePatient";
import { appStorage } from "@/src/lib/appStorage";
import { DEVICE_INTRO_SEEN_KEY } from "@/src/lib/deviceOnboardingFlags";

function UnauthenticatedGate() {
  const [target, setTarget] = useState<"/intro" | "/brand-splash" | null>(null);

  useEffect(() => {
    void (async () => {
      const seen = await appStorage.getItem(DEVICE_INTRO_SEEN_KEY);
      setTarget(seen === "1" ? "/brand-splash" : "/intro");
    })();
  }, []);

  if (!target) {
    return <ScreenLoading message="A preparar…" />;
  }

  return <Redirect href={target} />;
}

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { hasConsent, loading: consentLoading } = useConsent();
  const { patient, loading: patientLoading, fetchError: patientFetchError, refresh: refreshPatient } = usePatient();
  const { theme } = useAppTheme();

  if (authLoading) {
    return <ScreenLoading message="A verificar sessão…" />;
  }

  if (!session) {
    return <UnauthenticatedGate />;
  }

  if (consentLoading) {
    return <ScreenLoading message="A carregar preferências…" />;
  }

  if (!hasConsent) {
    return <Redirect href="/lgpd-consent" />;
  }

  if (patientLoading) {
    return <ScreenLoading message="A carregar o seu perfil…" />;
  }

  /** Erro ao carregar paciente: não redirecionar silenciosamente (evita loop e dados inconsistentes). */
  if (patientFetchError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: theme.spacing.xl, backgroundColor: theme.colors.background.primary }}>
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Não foi possível carregar o perfil</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          {patientFetchError.message}
        </Text>
        <Pressable
          onPress={() => {
            void refreshPatient();
          }}
          style={{
            marginTop: theme.spacing.lg,
            alignSelf: "flex-start",
            backgroundColor: theme.colors.semantic.treatment,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.md,
          }}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  if (!patient) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
