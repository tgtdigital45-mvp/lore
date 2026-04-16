import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { completeOAuthRedirect } from "@/src/auth/oauth";

/**
 * Conclui OAuth quando a app abre via deep link (cold start ou background).
 * O fluxo principal continua em `openAuthSessionAsync`; esta tela cobre universal links / scheme.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    async function handleUrl(url: string) {
      if (done.current) return;
      const res = await completeOAuthRedirect(url);
      if (res.error) {
        setErr(res.error);
        return;
      }
      done.current = true;
      router.replace("/(tabs)");
    }

    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleUrl(url);
    });

    void Linking.getInitialURL().then((u) => {
      if (u) void handleUrl(u);
    });

    return () => sub.remove();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      {err ? (
        <>
          <Text style={{ color: "#b91c1c", textAlign: "center", marginBottom: 24 }} accessibilityRole="alert">
            {err}
          </Text>
          <Pressable
            onPress={() => router.replace("/login")}
            style={{ flexDirection: "row", alignItems: "center", padding: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao login"
          >
            <FontAwesome name="chevron-left" size={16} color="#007AFF" />
            <Text style={{ color: "#007AFF", marginLeft: 8, fontWeight: "600" }}>Voltar ao login</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" accessibilityLabel="Carregando" />
          <Text style={{ marginTop: 16 }} accessibilityLiveRegion="polite">
            A concluir sessão…
          </Text>
        </>
      )}
    </View>
  );
}
