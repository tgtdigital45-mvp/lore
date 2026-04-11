export function formatAuthError(err: { message: string; status?: number } | null): string {
  if (!err) return "";
  const code = err.status;
  const msg = (err.message ?? "").toLowerCase();

  if (code === 429 || msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Muitas tentativas. Aguarde 1–2 minutos ou tente outra rede. O limite vem do serviço de autenticação.";
  }
  return err.message;
}
