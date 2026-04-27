import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaXHubSignature256 } from "./lib/metaWebhookSignature.js";

describe("verifyMetaXHubSignature256", () => {
  it("aceita assinatura válida", () => {
    const secret = "test_secret";
    const body = Buffer.from('{"object":"test"}', "utf8");
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyMetaXHubSignature256(body, sig, secret)).toBe(true);
  });

  it("rejeita assinatura incorreta", () => {
    const body = Buffer.from("{}", "utf8");
    expect(verifyMetaXHubSignature256(body, "sha256=deadbeef", "secret")).toBe(false);
  });

  it("rejeita sem app secret", () => {
    expect(verifyMetaXHubSignature256(Buffer.from("{}"), "sha256=abc", "")).toBe(false);
  });
});
