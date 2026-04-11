import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";

export default function Index() {
  const { session, loading } = useAuth();
  const { theme } = useAppTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background.primary }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
