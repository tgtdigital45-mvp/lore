import { resolveSupabaseConfig, supabase } from "@/src/lib/supabase";

/**
 * Elimina o utilizador autenticado no GoTrue (`DELETE /auth/v1/user`).
 * Em cascata, o Postgres remove `profiles` e dados ligados (ON DELETE CASCADE), conforme migrações.
 *
 * No dashboard Supabase: Auth → pode ser necessário permitir que utilizadores apaguem a própria conta
 * (conforme versão / política do projeto).
 */
export async function deleteAuthenticatedAccount(): Promise<{ error: string | null }> {
  const { url, anonKey } = resolveSupabaseConfig();
  if (!url || !anonKey) {
    return { error: "Configuração Supabase em falta." };
  }

  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();
  if (sessionErr || !session?.access_token) {
    return { error: "Sessão inválida. Entre novamente." };
  }

  const authUrl = `${url.replace(/\/$/, "")}/auth/v1/user`;
  const res = await fetch(authUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    let msg = `Não foi possível excluir a conta (${res.status}).`;
    try {
      const j = (await res.json()) as { msg?: string; error_description?: string; message?: string; error?: string };
      const detail = j.msg || j.error_description || j.message || j.error;
      if (detail && typeof detail === "string") msg = detail;
    } catch {
      try {
        const t = await res.text();
        if (t) msg = t.slice(0, 240);
      } catch {
        /* ignore */
      }
    }
    return { error: msg };
  }

  try {
    await supabase.auth.signOut();
  } catch {
    /* sessão já invalidada no servidor */
  }
  return { error: null };
}
