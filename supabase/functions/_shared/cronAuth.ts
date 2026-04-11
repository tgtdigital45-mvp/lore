/** Shared guard for cron/internal Edge Functions. Set CRON_SECRET in Supabase secrets. */
export function requireCronAuth(req: Request): Response | null {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || secret.length < 16) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
