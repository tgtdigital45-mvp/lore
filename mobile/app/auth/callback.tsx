import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { parseAuthParamsFromUrl } from "@/src/auth/oauth";
import { supabase } from "@/src/lib/supabase";

/**
 * Conclui OAuth quando a app abre via deep link (cold start ou background).
 * O fluxo principal continua em `openAuthSessionAsync`; este tela cobre universal links / scheme.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    async function handleUrl(url: string) {
      if (done.current) return;
      const p = parseAuthParamsFromUrl(url);
      const access_token = p.access_token;
      const refresh_token = p.refresh_token;
      if (!access_token || !refresh_token) {
        setErr("Tokens OAuth em falta no URL. Confirme o redirect no Supabase.");
        return;
      }
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setErr(error.message);
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
        <Text style={{ color: "#b91c1c", textAlign: "center" }} accessibilityRole="alert">
          {err}
        </Text>
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
