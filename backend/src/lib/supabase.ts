import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "./config.js";

export function createUserSupabase(env: Env, accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** RLS ignorado — usar só no servidor (webhook Meta, insert outbound). */
export function createServiceSupabase(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
