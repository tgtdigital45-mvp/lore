/**
 * CORS para chamadas do browser (dashboard) às Edge Functions.
 * O preflight OPTIONS tem de devolver 2xx com cabeçalhos completos.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const requested = req.headers.get("Access-Control-Request-Headers");
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers":
      requested?.trim() ||
      "authorization, x-client-info, apikey, content-type, accept, prefer, baggage, sentry-trace",
    "Access-Control-Max-Age": "86400",
  };
}

/** Resposta a OPTIONS (preflight). Corpo "ok" + 200 para máxima compatibilidade com proxies. */
export function handleOptions(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response("ok", { status: 200, headers: corsHeaders(req) });
}
