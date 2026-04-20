import { supabase } from "@/lib/supabase";

/**
 * URL da Edge Function.
 * Preferimos sempre `VITE_SUPABASE_URL` no browser (igual ao cliente Supabase), para não depender
 * do proxy do Vite — sem proxy registado, `/functions/v1/...` no localhost devolve 404.
 * Só em dev, se a URL estiver em falta, usa caminho relativo (requer proxy no `vite.config`).
 */
export function edgeFunctionUrl(functionName: string): string {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (base) {
    return `${base}/functions/v1/${functionName}`;
  }
  if (import.meta.env.DEV) {
    return `/functions/v1/${functionName}`;
  }
  throw new Error("Defina VITE_SUPABASE_URL no .env.");
}

/** POST JSON com JWT do utilizador (mesmos cabeçalhos que `supabase.functions.invoke`). */
export async function postEdgeFunctionJson<T>(functionName: string, body: unknown): Promise<T> {
  const { data: auth } = await supabase.auth.getSession();
  const token = auth.session?.access_token;
  if (!token) {
    throw new Error("Sessão inválida ou expirada.");
  }
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anon) {
    throw new Error("Configuração em falta (VITE_SUPABASE_ANON_KEY).");
  }

  const res = await fetch(edgeFunctionUrl(functionName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: anon,
      "x-client-info": "hospital-dashboard",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    if (!res.ok) throw new Error(raw || res.statusText);
    throw new Error("Resposta inválida do servidor.");
  }

  if (!res.ok) {
    const err = parsed as { error?: string; message?: string } | null;
    throw new Error(String(err?.message ?? err?.error ?? (raw || `Erro HTTP ${res.status}`)));
  }

  return parsed as T;
}
