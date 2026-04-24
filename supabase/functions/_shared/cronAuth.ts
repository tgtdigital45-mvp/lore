/** Shared guard for cron/internal Edge Functions. Set CRON_SECRET in Supabase secrets. */
import { timingSafeEqual } from "node:crypto";

export function requireCronAuth(req: Request): Response | null {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || secret.length < 16) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const expected = `Bearer ${secret}`;
  const auth = req.headers.get("Authorization") ?? "";
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(auth, "utf8");
  if (a.length !== b.length) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
