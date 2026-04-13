import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type Extra = { supabaseUrl?: string; supabaseAnonKey?: string };

function resolveSupabaseConfig(): { url: string; anonKey: string } {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const fromEnv = {
    url: typeof process.env.EXPO_PUBLIC_SUPABASE_URL === "string" ? process.env.EXPO_PUBLIC_SUPABASE_URL.trim() : "",
    anonKey:
      typeof process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY === "string"
        ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim()
        : "",
  };
  return {
    url: fromEnv.url || extra?.supabaseUrl?.trim() || "",
    anonKey: fromEnv.anonKey || extra?.supabaseAnonKey?.trim() || "",
  };
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseConfig();

/**
 * SecureStore não persiste sessão no navegador. Na web usamos localStorage direto
 * (evita AsyncStorage quando o módulo nativo/legacy falha no bridge).
 */
const authStorage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) => {
          try {
            if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
              return Promise.resolve(globalThis.localStorage.getItem(key));
            }
          } catch {
            /* ignore */
          }
          return Promise.resolve(null);
        },
        setItem: (key: string, value: string) => {
          try {
            globalThis.localStorage?.setItem(key, value);
          } catch {
            /* ignore */
          }
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          try {
            globalThis.localStorage?.removeItem(key);
          } catch {
            /* ignore */
          }
          return Promise.resolve();
        },
      }
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    "[supabase] Falta URL ou anon key. Opções: (1) EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY em mobile/.env; " +
    "(2) SUPABASE_URL + SUPABASE_ANON_KEY em backend/.env (o app.config.js carrega esse arquivo). " +
    "Reinicia o Metro com: npx expo start -c";
  console.error(msg);
  throw new Error(msg);
}

/** Cliente único; URL/key vêm do Metro (EXPO_PUBLIC_*) ou de `expo.extra` (app.config + backend/.env). */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});
