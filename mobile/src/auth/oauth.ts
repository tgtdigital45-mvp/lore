import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";
import { supabase } from "@/src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export function getOAuthRedirectUri(): string {
  return makeRedirectUri({ scheme: "mobile", path: "auth/callback" });
}

function parseAuthParamsFromUrl(url: string): Record<string, string> {
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  let paramStr = "";
  if (hashIdx >= 0) paramStr = url.slice(hashIdx + 1);
  else if (queryIdx >= 0) paramStr = url.slice(queryIdx + 1);
  const params = new URLSearchParams(paramStr);
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
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
    return result.type === "cancel" ? {} : { error: "Login Google cancelado ou falhou." };
  }
  const p = parseAuthParamsFromUrl(result.url);
  const access_token = p.access_token;
  const refresh_token = p.refresh_token;
  if (!access_token || !refresh_token) {
    return { error: "Resposta OAuth sem tokens. Confirme o redirect em Supabase (mobile://auth/callback)." };
  }
  const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
  if (setErr) return { error: setErr.message };
  return {};
}

export async function signInWithAppleNative(): Promise<{ error?: string }> {
  if (Platform.OS !== "ios") return { error: "Sign in with Apple só está disponível no iOS." };
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) return { error: "Apple Sign-In não disponível neste dispositivo." };

  const rawNonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "ERR_CANCELED" || code === "ERR_REQUEST_CANCELED") return {};
    const msg = e instanceof Error ? e.message : "Apple Sign-In falhou.";
    return { error: msg };
  }

  const token = credential.identityToken;
  if (!token) return { error: "Apple não devolveu identity token." };

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token,
    nonce: rawNonce,
  });
  if (error) return { error: error.message };
  return {};
}
