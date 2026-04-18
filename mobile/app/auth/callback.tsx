import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { addEventListener as linkingAddListener, getInitialURL, useLinkingURL } from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatAuthError } from "@/src/auth/authErrors";
import {
  completeOAuthRedirectResilient,
  getOAuthRedirectUri,
  isAppOAuthCallbackUrl,
} from "@/src/auth/oauth";
import { supabase } from "@/src/lib/supabase";

function pickParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Tela de callback OAuth — abre quando o deep link `auraonco://auth/callback` (build nativa)
 * ou `exp://.../--/auth/callback` (Expo Go) chega ao app.
 *
 * Fontes de URL (a primeira que tiver código/tokens/erro ganha):
 *   1. `useLinkingURL()` — módulo nativo Expo; cobre URLs que o Router ainda não expôs em params.
 *   2. `useLocalSearchParams()` — query parseada pelo Expo Router (warm start).
 *   3. `getInitialURL()` — cold start.
 *   4. `addEventListener("url")` — chegadas tardias.
 *
 * Usa `completeOAuthRedirectResilient` para não falhar quando o mesmo `code` já foi trocado
 * em `oauth.ts` (corrida entre ASWebAuthenticationSession e esta rota).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = useLinkingURL();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
    access_token?: string | string[];
    refresh_token?: string | string[];
  }>();
  const [err, setErr] = useState<string | null>(null);
  const done = useRef(false);

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    async function handleUrl(url: string) {
      if (done.current) return;
      if (!isAppOAuthCallbackUrl(url)) return;

      console.log("[auth/callback] handleUrl:", url.split("?")[0], "(query/hash omitidos no log)");

      const { data: existing } = await supabase.auth.getSession();
      if (existing.session?.user) {
        console.log("[auth/callback] sessão já existia — a ir para (tabs)");
        done.current = true;
        router.replace("/(tabs)");
        return;
      }

      done.current = true;
      const res = await completeOAuthRedirectResilient(url);
      console.log("[auth/callback] completeOAuthRedirectResilient:", res.error ? `erro: ${res.error}` : "OK");
      if (res.error) {
        const { data: afterErr } = await supabase.auth.getSession();
        if (afterErr.session?.user) {
          console.log("[auth/callback] sessão após erro — a ir para (tabs)");
          router.replace("/(tabs)");
          return;
        }
        done.current = false;
        console.error("[auth/callback] falha OAuth:", res.error);
        setErr(res.error);
        return;
      }
      router.replace("/(tabs)");
    }

    function urlFromRouterParams(): string | null {
      const code = pickParam(params.code);
      const access = pickParam(params.access_token);
      const oauthErr = pickParam(params.error);
      if (!code && !access && !oauthErr) return null;
      const entries: Record<string, string> = {};
      const c = pickParam(params.code);
      const at = pickParam(params.access_token);
      const rt = pickParam(params.refresh_token);
      const er = pickParam(params.error);
      const ed = pickParam(params.error_description);
      if (c) entries.code = c;
      if (at) entries.access_token = at;
      if (rt) entries.refresh_token = rt;
      if (er) entries.error = er;
      if (ed) entries.error_description = ed;
      const qs = new URLSearchParams(entries).toString();
      return `${getOAuthRedirectUri()}?${qs}`;
    }

    let cancelled = false;

    async function run() {
      const candidates: string[] = [];

      const initial = await getInitialURL();
      if (initial && isAppOAuthCallbackUrl(initial)) {
        candidates.push(initial);
      }

      const fromParams = urlFromRouterParams();
      if (fromParams) candidates.push(fromParams);

      if (linkingUrl && isAppOAuthCallbackUrl(linkingUrl)) {
        candidates.push(linkingUrl);
      }

      console.log("[auth/callback] candidatos URL:", {
        initial: initial && isAppOAuthCallbackUrl(initial) ? "(callback)" : initial ?? null,
        fromParams: fromParams ? "(construído a partir de params)" : null,
        linkingUrl: linkingUrl && isAppOAuthCallbackUrl(linkingUrl) ? "(linking)" : linkingUrl ?? null,
        total: candidates.length,
      });

      const seen = new Set<string>();
      for (const u of candidates) {
        if (cancelled || done.current) return;
        if (seen.has(u)) continue;
        seen.add(u);
        await handleUrl(u);
        if (done.current) return;
      }
    }

    void run();

    const sub = linkingAddListener("url", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [linkingUrl, paramsKey, router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      {err ? (
        <>
          <Text style={{ color: "#b91c1c", textAlign: "center", marginBottom: 24 }} accessibilityRole="alert">
            {formatAuthError({ message: err })}
          </Text>
          <Pressable
            onPress={() => {
              void (async () => {
                await supabase.auth.signOut({ scope: "local" });
                router.replace("/login");
              })();
            }}
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
