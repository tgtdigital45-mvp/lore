import { describe, expect, it } from "vitest";
import { extractEvolutionInboundMessages, shouldProcessEvolutionWebhook } from "./evolutionWebhook.js";

/** Formato alinhado ao webhook Evolution v2 (ex.: payload recebido por integrações tipo n8n). */
const messagesUpsertPayload = {
  event: "messages.upsert",
  instance: "TGT - SOLUÇÕES DIGITAIS",
  data: {
    key: {
      remoteJid: "554599998877@s.whatsapp.net",
      remoteJidAlt: "554599998877@s.whatsapp.net",
      fromMe: false,
      id: "3AA6TESTMSGID01",
      participant: "",
    },
    pushName: "Paciente Teste",
    status: "DELIVERY_ACK",
    message: {
      conversation: "ola, quero agendar uma consulta",
    },
    messageType: "conversation",
    messageTimestamp: 1768539542,
    instanceId: "1ec6eb6f-56ce-46e3-8d73-b3e253aca831",
    source: "ios",
  },
  destination: "https://example.com/api/evolution/webhook?secret=x",
  date_time: "2026-01-16T01:59:03.104Z",
  sender: "554588230709@s.whatsapp.net",
  server_url: "https://example-evolution.example.com",
  apikey: "INSTANCE-TOKEN-EXAMPLE",
};

describe("shouldProcessEvolutionWebhook", () => {
  it("aceita qualquer payload se EVOLUTION_INSTANCE_NAME não for UUID", () => {
    expect(shouldProcessEvolutionWebhook(messagesUpsertPayload, "TGT - SOLUÇÕES DIGITAIS")).toBe(true);
    expect(shouldProcessEvolutionWebhook(messagesUpsertPayload, undefined)).toBe(true);
  });

  it("filtra por data.instanceId quando o env é UUID", () => {
    expect(shouldProcessEvolutionWebhook(messagesUpsertPayload, "1ec6eb6f-56ce-46e3-8d73-b3e253aca831")).toBe(true);
    expect(shouldProcessEvolutionWebhook(messagesUpsertPayload, "00000000-0000-4000-8000-000000000001")).toBe(false);
  });
});

describe("extractEvolutionInboundMessages", () => {
  it("extrai texto e dígitos do remoteJid (payload messages.upsert)", () => {
    const items = extractEvolutionInboundMessages(messagesUpsertPayload);
    expect(items).toHaveLength(1);
    expect(items[0].fromDigits).toBe("554599998877");
    expect(items[0].text).toBe("ola, quero agendar uma consulta");
    expect(items[0].fromMe).toBe(false);
    expect(items[0].externalId).toBe("3AA6TESTMSGID01");
  });

  it("ignora mensagens fromMe", () => {
    const fromMe = structuredClone(messagesUpsertPayload) as typeof messagesUpsertPayload;
    (fromMe.data.key as { fromMe: boolean }).fromMe = true;
    const items = extractEvolutionInboundMessages(fromMe);
    expect(items).toHaveLength(1);
    expect(items[0].fromMe).toBe(true);
  });

  it("ignora grupos (@g.us)", () => {
    const g = structuredClone(messagesUpsertPayload) as typeof messagesUpsertPayload;
    (g.data.key as { remoteJid: string }).remoteJid = "120363123@g.us";
    expect(extractEvolutionInboundMessages(g)).toHaveLength(0);
  });
});
