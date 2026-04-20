import type { Express, Request, Response } from "express";
import type { Env } from "./config.js";
import { logStructured } from "./logger.js";
import { createServiceSupabase } from "./supabase.js";
import type { SupabaseClient } from "@supabase/supabase-js";

type InboundExtract = { fromDigits: string; text: string; externalId: string; fromMe: boolean };

function textFromMessagePayload(msg: Record<string, unknown>): string | null {
  const m = msg.message;
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  if (typeof o.conversation === "string") return o.conversation;
  const ext = o.extendedTextMessage;
  if (ext && typeof ext === "object") {
    const t = (ext as Record<string, unknown>).text;
    if (typeof t === "string") return t;
  }
  const img = o.imageMessage as Record<string, unknown> | undefined;
  if (img && typeof img.caption === "string") return img.caption;
  return null;
}

function pushFromMessageNode(m: unknown, out: InboundExtract[]) {
  if (!m || typeof m !== "object") return;
  const row = m as Record<string, unknown>;
  const key = row.key;
  if (!key || typeof key !== "object") return;
  const k = key as Record<string, unknown>;
  const fromMe = Boolean(k.fromMe);
  const remoteJid = typeof k.remoteJid === "string" ? k.remoteJid : "";
  const id = typeof k.id === "string" ? k.id : "";
  if (!remoteJid || remoteJid.endsWith("@g.us")) return;
  const digits = remoteJid.split("@")[0]?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return;
  const text = textFromMessagePayload(row);
  if (!text?.trim()) return;
  const externalId = id || `${remoteJid}:${row.messageTimestamp ?? Date.now()}`;
  out.push({ fromDigits: digits, text: text.trim(), externalId, fromMe });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Quando `EVOLUTION_INSTANCE_NAME` é um UUID (como no Manager), ignora webhooks de outras
 * instâncias que partilhem o mesmo URL/secret. Nomes legíveis (ex.: "Clínica X") não aplicam
 * este filtro — configure um webhook dedicado por instância na Evolution.
 */
export function shouldProcessEvolutionWebhook(body: unknown, evolutionInstanceName: string | undefined): boolean {
  const cfg = evolutionInstanceName?.trim();
  if (!cfg || !UUID_RE.test(cfg)) return true;
  if (!body || typeof body !== "object") return true;
  const data = (body as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return true;
  const id = (data as Record<string, unknown>).instanceId;
  if (typeof id !== "string" || !id.trim()) return true;
  return id.trim() === cfg;
}

/** Extrai mensagens de texto de payloads comuns do webhook Evolution v2 / Baileys. */
export function extractEvolutionInboundMessages(body: unknown): InboundExtract[] {
  const out: InboundExtract[] = [];
  if (Array.isArray(body)) {
    for (const el of body) {
      out.push(...extractEvolutionInboundMessages(el));
    }
    return out;
  }
  if (!body || typeof body !== "object") return out;
  const root = body as Record<string, unknown>;
  const data = root.data;
  if (Array.isArray(data)) {
    for (const chunk of data) {
      if (!chunk || typeof chunk !== "object") continue;
      const c = chunk as Record<string, unknown>;
      if (Array.isArray(c.messages)) {
        for (const m of c.messages) pushFromMessageNode(m, out);
      } else {
        pushFromMessageNode(c, out);
      }
    }
    return out;
  }
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.messages)) {
      for (const m of d.messages) pushFromMessageNode(m, out);
    } else {
      pushFromMessageNode(d, out);
    }
    return out;
  }
  if (Array.isArray(root.messages)) {
    for (const m of root.messages) pushFromMessageNode(m, out);
  }
  return out;
}

function digitsFromE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15 ? d : null;
}

async function findPatientByPhoneDigits(
  admin: SupabaseClient,
  digits: string
): Promise<{ id: string; hospital_id: string } | null> {
  const { data, error } = await admin
    .from("patients")
    .select("id, hospital_id, profiles!patients_profile_id_fkey ( phone_e164 )")
    .limit(3000);
  if (error || !data?.length) return null;
  for (const row of data as { id: string; hospital_id: string; profiles: unknown }[]) {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const phone = p && typeof p === "object" ? (p as { phone_e164?: string }).phone_e164 : null;
    const d = digitsFromE164(phone ?? null);
    if (d === digits) return { id: row.id, hospital_id: row.hospital_id };
  }
  return null;
}

export function mountEvolutionWebhook(app: Express, env: Env) {
  app.post("/api/evolution/webhook", async (req: Request, res: Response) => {
    if (!env.EVOLUTION_WEBHOOK_SECRET?.trim()) {
      logStructured("evolution_webhook_reject", { reason: "missing_evolution_webhook_secret" });
      res.status(503).json({ error: "evolution_webhook_not_configured" });
      return;
    }
    const q = req.query.secret;
    const secret =
      typeof q === "string"
        ? q
        : Array.isArray(q)
          ? q[0]
          : "";
    if (secret !== env.EVOLUTION_WEBHOOK_SECRET) {
      logStructured("evolution_webhook_reject", { reason: "invalid_secret" });
      res.status(403).json({ error: "forbidden" });
      return;
    }

    if (!shouldProcessEvolutionWebhook(req.body, env.EVOLUTION_INSTANCE_NAME)) {
      logStructured("evolution_webhook_skip", { reason: "instance_id_mismatch" });
      res.status(200).json({ received: true, skipped: "instance" });
      return;
    }

    const admin = createServiceSupabase(env);
    if (!admin) {
      res.status(503).json({ error: "service_role_not_configured" });
      return;
    }

    res.status(200).json({ received: true });

    try {
      const items = extractEvolutionInboundMessages(req.body).filter((x) => !x.fromMe);
      for (const item of items) {
        const patient = await findPatientByPhoneDigits(admin, item.fromDigits);
        if (!patient) {
          logStructured("evolution_inbound_no_patient", { fromDigits: item.fromDigits.slice(0, 4) + "…" });
          continue;
        }
        const { error } = await admin.from("whatsapp_inbound_messages").insert({
          patient_id: patient.id,
          hospital_id: patient.hospital_id,
          body: item.text,
          from_phone: item.fromDigits,
          provider_external_id: item.externalId,
          raw_payload: req.body as Record<string, unknown>,
        });
        if (error?.code === "23505") continue;
        if (error) {
          logStructured("evolution_inbound_insert_failed", { message: error.message });
        }
      }
    } catch (e) {
      logStructured("evolution_webhook_process_error", { message: e instanceof Error ? e.message : String(e) });
    }
  });
}
