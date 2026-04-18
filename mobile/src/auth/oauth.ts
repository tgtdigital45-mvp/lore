import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

function appAuthScheme(): string {
  const s = Constants.expoConfig?.scheme;
  return typeof s === "string" && s.length > 0 ? s : "auraonco";
}

/**
 * URI de redirect OAuth — deve estar exatamente igual em:
 *   1. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
 *   2. intentFilters no app.json (Android) e scheme no app.json (iOS)
 *
 * Valor esperado em builds nativas: `auraonco://auth/callback`
 *
 * No Google Cloud Console:
 *   - Tipo Web: redirecionar para `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
 */
export function getOAuthRedirectUri(): string {
  /**
   * Em Expo Go / dev, `createURL` devolve `exp://<IP>:8081/--/auth/callback`.
   * Em build nativa (EAS), devolve `auraonco://auth/callback`.
   * Não force `scheme` em dev — o valor tem de bater byte a byte com o que o Supabase
   * recebe em `redirectTo` e com as Redirect URLs do dashboard.
   */
  const uri = Linking.createURL("auth/callback", { scheme: appAuthScheme() });
  console.log("[oauth] redirectTo — copie para Supabase → Redirect URLs:", uri);
  return uri;
}

/** Base do redirect (sem ?code= / #fragment) para comparar deep links. */
export function getOAuthRedirectBase(): string {
  return getOAuthRedirectUri().split("?")[0].split("#")[0];
}

/** Aceita tanto `exp://...` (Expo Go) como `auraonco://...` (build). */
export function isAppOAuthCallbackUrl(url: string): boolean {
  const base = getOAuthRedirectBase();
  const u = url.split("?")[0].split("#")[0];
  return u === base || url.startsWith(`${base}?`) || url.startsWith(`${base}#`);
}

/**
 * Extrai parâmetros do redirect OAuth: query (`?code=`) e fragmento (`#access_token=`).
 * O fluxo PKCE do Supabase costuma devolver só `code` na query; o fluxo implícito usa hash.
 */
export function parseAuthParamsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const u = new URL(url);
    u.searchParams.forEach((v, k) => {
      out[k] = v;
    });
    if (u.hash && u.hash.length > 1) {
      const hp = new URLSearchParams(u.hash.slice(1));
      hp.forEach((v, k) => {
        out[k] = v;
      });
    }
  } catch {
    const hashIdx = url.indexOf("#");
    const qIdx = url.indexOf("?");
    const merge = (raw: string) => {
      const sp = new URLSearchParams(raw);
      sp.forEach((v, k) => {
        out[k] = v;
      });
    };
    if (qIdx >= 0) {
      const end = hashIdx >= 0 ? hashIdx : url.length;
      merge(url.slice(qIdx + 1, end));
    }
    if (hashIdx >= 0) merge(url.slice(hashIdx + 1));
  }
  return out;
}

/**
 * Conclui sessão após o browser devolver o redirect (`openAuthSessionAsync` ou deep link).
 * Suporta tokens no fragmento e troca PKCE com `?code=`.
 */
export async function completeOAuthRedirect(url: string): Promise<{ error?: string }> {
  try {
    const p = parseAuthParamsFromUrl(url);
    if (p.error) {
      const errMsg = p.error_description?.replace(/\+/g, " ") || p.error;
      console.error("[oauth] completeOAuthRedirect: erro no redirect OAuth:", errMsg);
      return { error: errMsg };
    }
    const access_token = p.access_token;
    const refresh_token = p.refresh_token;
    const code = p.code;
    console.log("[oauth] completeOAuthRedirect: params", {
      hasAccessToken: Boolean(access_token),
      hasRefreshToken: Boolean(refresh_token),
      hasCode: Boolean(code),
    });

    /**
     * Sessão antiga no SecureStore (refresh revogado/corrompido) pode fazer o cliente tentar
     * refrescar em paralelo e devolver "Invalid Refresh Token". Limpar só o armazenamento
     * local antes de aplicar tokens/código novos evita esse conflito.
     */
    if ((access_token && refresh_token) || code) {
      await supabase.auth.signOut({ scope: "local" });
    }

    if (access_token && refresh_token) {
      console.log("[oauth] completeOAuthRedirect: setSession (tokens no fragmento)");
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error("[oauth] completeOAuthRedirect: setSession error:", error.message);
        return { error: error.message };
      }
      return {};
    }
    if (code) {
      console.log("[oauth] completeOAuthRedirect: exchangeCodeForSession (PKCE)");
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("[oauth] completeOAuthRedirect: exchangeCodeForSession error:", error.message);
        return { error: error.message };
      }
      return {};
    }
    const incomplete =
      "Resposta OAuth incompleta (sem tokens nem código). Confirme o redirect no Supabase (Google) e o URL " +
      `${appAuthScheme()}://auth/callback.`;
    console.error("[oauth] completeOAuthRedirect:", incomplete);
    return { error: incomplete };
  } catch (e) {
    console.error("[oauth] completeOAuthRedirect: exceção inesperada:", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Conclui OAuth com tolerância à corrida: `openAuthSessionAsync` e a rota `auth/callback`
 * podem ambos receber o mesmo `code`. A segunda troca falha — mas a sessão já pode existir.
 */
export async function completeOAuthRedirectResilient(url: string): Promise<{ error?: string }> {
  try {
    const { data: pre } = await supabase.auth.getSession();
    if (pre.session?.user) {
      console.log("[oauth] completeOAuthRedirectResilient: sessão já existia, a ignorar troca");
      return {};
    }
    const first = await completeOAuthRedirect(url);
    if (!first.error) {
      console.log("[oauth] completeOAuthRedirectResilient: primeira tentativa OK");
      return {};
    }
    console.warn("[oauth] completeOAuthRedirectResilient: primeira tentativa falhou:", first.error);
    const { data: mid } = await supabase.auth.getSession();
    if (mid.session?.user) {
      console.log("[oauth] completeOAuthRedirectResilient: sessão apareceu após falha (corrida)");
      return {};
    }

    const msg = first.error.toLowerCase();
    const looksLikeRefreshFailure =
      msg.includes("refresh") && (msg.includes("invalid") || msg.includes("not found") || msg.includes("revoked"));
    if (looksLikeRefreshFailure) {
      console.warn("[oauth] completeOAuthRedirectResilient: parece falha de refresh — retry após signOut local");
      await supabase.auth.signOut({ scope: "local" });
      const retry = await completeOAuthRedirect(url);
      if (!retry.error) {
        console.log("[oauth] completeOAuthRedirectResilient: retry após refresh OK");
        return {};
      }
      console.error("[oauth] completeOAuthRedirectResilient: retry após refresh falhou:", retry.error);
      const { data: afterRetry } = await supabase.auth.getSession();
      if (afterRetry.session?.user) {
        return {};
      }
      return { error: retry.error };
    }

    const looksLikeUsedCode =
      msg.includes("code") &&
      (msg.includes("invalid") || msg.includes("expired") || msg.includes("already") || msg.includes("grant"));
    if (looksLikeUsedCode) {
      console.warn("[oauth] completeOAuthRedirectResilient: código possivelmente já usado — a verificar sessão");
      const { data: post } = await supabase.auth.getSession();
      if (post.session?.user) {
        return {};
      }
    }
    return first;
  } catch (e) {
    console.error("[oauth] completeOAuthRedirectResilient: exceção inesperada:", e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function signInWithOAuthGoogle(): Promise<{ error?: string }> {
  const redirectTo = getOAuthRedirectUri();
  console.log("[oauth] signInWithOAuthGoogle: redirectTo =", redirectTo);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) {
    console.error("[oauth] signInWithOAuthGoogle: signInWithOAuth error:", error.message);
    return { error: error.message };
  }
  if (!data?.url) {
    console.error("[oauth] signInWithOAuthGoogle: URL de OAuth indisponível (data.url vazio)");
    return { error: "URL de OAuth indisponível." };
  }

  /**
   * Usa duas fontes de URL em paralelo:
   *   1. `openAuthSessionAsync` — usa ASWebAuthenticationSession no iOS, que intercepta o
   *      redirect custom-scheme ANTES de chegar ao sistema. Resolve com `type: "success"`.
   *   2. `Linking.addEventListener` — captura o deep link quando o browser externo (Google App
   *      ou Safari) processa o OAuth fora do ASWebAuthenticationSession. Nesse caso
   *      `openAuthSessionAsync` retorna `"dismiss"` em vez de `"success"`.
   *
   * IMPORTANTE: quando o resultado é `"dismiss"` (e não `"cancel"`), NÃO liquidamos
   * imediatamente — o deep link pode estar a caminho via Linking. O listener fica ativo
   * até capturar a URL ou até o timeout de segurança expirar.
   */
  return new Promise<{ error?: string }>((resolve) => {
    let settled = false;
    let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

    const finish = async (url: string | null, cancelled = false) => {
      if (settled) return;
      settled = true;
      if (dismissTimeout) clearTimeout(dismissTimeout);
      linkSub.remove();
      if (cancelled || !url) {
        resolve({});
        return;
      }
      const out = await completeOAuthRedirectResilient(url);
      if (out.error) {
        console.error("[oauth] signInWithOAuthGoogle: completeOAuthRedirectResilient:", out.error);
      }
      resolve(out);
    };

    const redirectBase = getOAuthRedirectBase();

    // Listener de deep link — cobre Android e o cenário iOS com browser externo.
    const linkSub = Linking.addEventListener("url", ({ url: incoming }) => {
      const base = incoming.split("?")[0].split("#")[0];
      if (base === redirectBase || incoming.startsWith(`${redirectBase}?`) || incoming.startsWith(`${redirectBase}#`)) {
        console.log("[oauth] signInWithOAuthGoogle: deep link recebido via Linking");
        void finish(incoming);
      }
    });

    WebBrowser.openAuthSessionAsync(data.url, redirectTo)
      .then((result) => {
        console.log("[oauth] signInWithOAuthGoogle: openAuthSessionAsync result:", JSON.stringify(result));
        if (result.type === "success" && result.url) {
          // Caminho normal: ASWebAuthenticationSession interceptou o redirect.
          void finish(result.url);
        } else if (result.type === "cancel") {
          // Usuário fechou explicitamente o browser.
          console.log("[oauth] signInWithOAuthGoogle: utilizador cancelou o browser");
          void finish(null, true);
        } else {
          // "dismiss": browser fechou sem URL — pode ser o Google App a processar o OAuth
          // externamente. O listener Linking permanece ativo; timeout de segurança para
          // desbloquear o UI caso nenhum deep link chegue.
          console.warn(
            "[oauth] signInWithOAuthGoogle: browser dismissed — a aguardar deep link ou timeout (15s)",
          );
          dismissTimeout = setTimeout(() => {
            void (async () => {
              const { data: sess } = await supabase.auth.getSession();
              if (sess.session?.user) {
                if (settled) return;
                settled = true;
                if (dismissTimeout) clearTimeout(dismissTimeout);
                linkSub.remove();
                console.log("[oauth] signInWithOAuthGoogle: sessão encontrada após dismiss (timeout)");
                resolve({});
                return;
              }
              if (!settled) {
                settled = true;
                if (dismissTimeout) clearTimeout(dismissTimeout);
                linkSub.remove();
                const msg =
                  "A sessão não foi estabelecida após o retorno do Google. Verifique se o Redirect URL está configurado no Supabase Dashboard.";
                console.error("[oauth] signInWithOAuthGoogle:", msg);
                resolve({ error: msg });
              }
            })();
          }, 15_000);
        }
      })
      .catch((e) => {
        console.error("[oauth] signInWithOAuthGoogle: openAuthSessionAsync exception:", e);
        if (settled) return;
        settled = true;
        if (dismissTimeout) clearTimeout(dismissTimeout);
        linkSub.remove();
        resolve({ error: e instanceof Error ? e.message : String(e) });
      });
  });
}
