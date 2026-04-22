import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  decodeJwt,
  jwtVerify,
} from "jose";
import type { Env } from "./config.js";

function supabaseAuthIssuer(env: Env): string {
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  return `${base}/auth/v1`;
}

const jwksBySupabaseBase = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getRemoteJwks(env: Env) {
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  let jwks = jwksBySupabaseBase.get(base);
  if (!jwks) {
    const jwksUrl = new URL(`${base}/auth/v1/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUrl);
    jwksBySupabaseBase.set(base, jwks);
  }
  return jwks;
}

const verifyOptions = (env: Env) => ({
  issuer: supabaseAuthIssuer(env),
  audience: "authenticated" as const,
});

/**
 * Verifica localmente o access token JWT do Supabase sem chamada HTTP a auth.getUser():
 * - HS256: chave simétrica (SUPABASE_JWT_SECRET);
 * - ES256 (e outros assimétricos): JWKS em `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
 */
export async function verifySupabaseAccessToken(
  token: string,
  env: Env
): Promise<{ userId: string } | { error: "invalid_token" }> {
  let algUsed = "unknown";
  try {
    const header = decodeProtectedHeader(token);
    algUsed = typeof header.alg === "string" ? header.alg : "unknown";
    const opts = verifyOptions(env);

    let payload: { sub?: unknown };
    if (header.alg === "HS256") {
      const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
      ({ payload } = await jwtVerify(token, secret, opts));
    } else {
      const jwks = getRemoteJwks(env);
      ({ payload } = await jwtVerify(token, jwks, opts));
    }
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) {
      return { error: "invalid_token" };
    }
    return { userId: sub };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      try {
        const claims = decodeJwt(token);
        const expiredAt = claims.exp ? new Date(claims.exp * 1000).toISOString() : "unknown";
        const issuerInToken = claims.iss ?? "unknown";
        const expectedIssuer = supabaseAuthIssuer(env);
        console.error(
          "[auth] JWT verification failed:",
          (err as Error).message,
          `| alg=${algUsed}`,
          `| token.iss="${issuerInToken}" expected="${expectedIssuer}"`,
          `| token.exp=${expiredAt} now=${new Date().toISOString()}`,
          `| SUPABASE_JWT_SECRET length=${env.SUPABASE_JWT_SECRET.length} (só usado com HS256)`,
        );
      } catch {
        console.error("[auth] JWT verification failed (token undecodable):", (err as Error).message);
      }
    }
    return { error: "invalid_token" };
  }
}
