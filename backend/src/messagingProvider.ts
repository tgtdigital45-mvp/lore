import type { Env } from "./config.js";

/**
 * Canal ativo para POST /api/whatsapp/send (Meta Cloud API ou Evolution API).
 * Com Meta e Evolution configurados, Meta ganha por defeito — defina `MESSAGING_PROVIDER=evolution`
 * para forçar Evolution (alinhado a stacks só Baileys/Evolution).
 */
export function resolveMessagingProvider(env: Env): "meta" | "evolution" | null {
  const ev =
    Boolean(env.EVOLUTION_API_BASE_URL?.trim()) &&
    Boolean(env.EVOLUTION_API_KEY?.trim()) &&
    Boolean(env.EVOLUTION_INSTANCE_NAME?.trim());
  const meta = Boolean(env.WHATSAPP_ACCESS_TOKEN?.trim()) && Boolean(env.WHATSAPP_PHONE_NUMBER_ID?.trim());
  const pref = env.MESSAGING_PROVIDER?.trim().toLowerCase();
  if (pref === "evolution") return ev ? "evolution" : null;
  if (pref === "meta") return meta ? "meta" : null;
  if (meta) return "meta";
  if (ev) return "evolution";
  return null;
}
