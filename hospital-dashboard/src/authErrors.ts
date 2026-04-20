/** Mensagens amigáveis para erros do GoTrue / Supabase Auth (inclui 429 rate limit). */

import { translateRawSupabaseMessage } from "@/lib/errorMessages";

export function formatAuthError(err: { message: string; status?: number } | null): string {
  if (!err) return "";
  const code = err.status;
  const msg = (err.message ?? "").trim();
  const lower = msg.toLowerCase();

  if (code === 429 || lower.includes("429") || lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Muitas tentativas em pouco tempo. O provedor de autenticação limita cadastros e logins. Aguarde 1 a 2 minutos, verifique sua conexão ou tente outro e-mail. Em desenvolvimento, desative confirmação por e-mail ou aumente limites no painel do Supabase.";
  }
  if (code === 422 || lower.includes("already registered") || lower.includes("user already")) {
    return "Este e-mail já está cadastrado. Use Entrar ou recuperação de senha.";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "E-mail ou senha incorretos.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirme o e-mail antes de entrar.";
  }
  if (lower.includes("user not found")) {
    return "Utilizador não encontrado.";
  }
  if (lower.includes("password") && lower.includes("should be at least")) {
    return "A senha deve ter o número mínimo de caracteres exigido.";
  }
  if (lower.includes("same as the old password")) {
    return "A nova senha não pode ser igual à anterior.";
  }
  if (lower.includes("signup is disabled")) {
    return "Novos registos estão desativados.";
  }
  if (lower.includes("email rate limit exceeded")) {
    return "Limite de envio de e-mails atingido. Aguarde alguns minutos.";
  }
  if (lower.includes("token has expired") || lower.includes("jwt expired")) {
    return "Sessão expirada. Inicie sessão novamente.";
  }

  const t = translateRawSupabaseMessage(msg);
  if (t) return t;

  return msg || "Não foi possível concluir a operação.";
}
