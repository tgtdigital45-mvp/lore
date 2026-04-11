import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { useConsent } from "@/src/hooks/useConsent";
import { usePatient } from "@/src/hooks/usePatient";

export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { hasConsent, loading: consentLoading } = useConsent();
  const { patient, loading: patientLoading } = usePatient();
  const { theme } = useAppTheme();

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background.primary }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (consentLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background.primary }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!hasConsent) {
    return <Redirect href="/lgpd-consent" />;
  }

  if (patientLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background.primary }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!patient) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
