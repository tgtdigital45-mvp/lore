import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/** Margem antes do `exp` para renovar (evita 401 em pedidos imediatos a seguir). */
const REFRESH_SKEW_MS = 120_000;

/**
 * Se o access token estiver expirado ou perto de expirar, chama `refreshSession`.
 * Em falha (refresh token inválido), faz `signOut` e devolve null.
 */
export async function refreshSupabaseSessionIfStale(session: Session | null): Promise<Session | null> {
  if (!session?.user) return null;
  if (session.expires_at == null) return session;
  const expMs = session.expires_at * 1000;
  if (Date.now() < expMs - REFRESH_SKEW_MS) {
    return session;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Sessão expirada; é necessário voltar a iniciar sessão.", error?.message ?? "");
    }
    await supabase.auth.signOut();
    return null;
  }
  return data.session;
}
