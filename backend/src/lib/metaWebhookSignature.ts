import crypto from "node:crypto";

/**
 * Verifica X-Hub-Signature-256 do Meta (WhatsApp Cloud API).
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export function verifyMetaXHubSignature256(rawBody: Buffer, header: string | string[] | undefined, appSecret: string): boolean {
  if (!appSecret || appSecret.length === 0) return false;
  const sig = Array.isArray(header) ? header[0] : header;
  if (!sig || typeof sig !== "string" || !sig.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
