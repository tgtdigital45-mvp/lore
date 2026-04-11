/** Mensagens amigáveis para erros do GoTrue / Supabase Auth (inclui 429 rate limit). */

export function formatAuthError(err: { message: string; status?: number } | null): string {
  if (!err) return "";
  const code = err.status;
  const msg = (err.message ?? "").toLowerCase();

  if (code === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Muitas tentativas em pouco tempo. O provedor de autenticação limita cadastros e logins. Aguarde 1 a 2 minutos, verifique sua conexão ou tente outro e-mail. Em desenvolvimento, desative confirmação por e-mail ou aumente limites no painel do Supabase.";
  }
  if (code === 422 || msg.includes("already registered") || msg.includes("user already")) {
    return "Este e-mail já está cadastrado. Use Entrar ou recuperação de senha.";
  }
  return err.message;
}
