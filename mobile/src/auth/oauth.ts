import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

function appAuthScheme(): string {
  const s = Constants.expoConfig?.scheme;
  return typeof s === "string" && s.length > 0 ? s : "auraonco";
}

export function getOAuthRedirectUri(): string {
  return makeRedirectUri({ scheme: appAuthScheme(), path: "auth/callback" });
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
  const p = parseAuthParamsFromUrl(url);
  if (p.error) {
    return { error: p.error_description?.replace(/\+/g, " ") || p.error };
  }
  const access_token = p.access_token;
  const refresh_token = p.refresh_token;
  const code = p.code;
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return error ? { error: error.message } : {};
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { error: error.message } : {};
  }
  return {
    error:
      "Resposta OAuth incompleta (sem tokens nem código). Confirme o redirect no Supabase (Google) e o URL " +
      `${appAuthScheme()}://auth/callback.`,
  };
}

export async function signInWithOAuthGoogle(): Promise<{ error?: string }> {
  const redirectTo = getOAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data?.url) return { error: "URL de OAuth indisponível." };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success" || !result.url) {
    return result.type === "cancel" ? {} : { error: "Entrada com Google cancelada ou falhou." };
  }
  return completeOAuthRedirect(result.url);
}
