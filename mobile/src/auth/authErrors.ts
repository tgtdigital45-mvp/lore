export function formatAuthError(err: { message: string; status?: number } | null): string {
  if (!err) return "";
  const code = err.status;
  const msg = (err.message ?? "").toLowerCase();

  if (code === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Muitas tentativas. Aguarde 1–2 minutos ou tente outra rede. O limite vem do serviço de autenticação.";
  }
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("email not confirmed")) {
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  }
  if (msg.includes("user already registered") || msg.includes("already exists")) {
    return "Este e-mail já está cadastrado.";
  }
  if (msg.includes("password") && msg.includes("weak")) {
    return "Senha muito fraca. Use pelo menos 6 caracteres.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("connection")) {
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  }
  return err.message;
}
