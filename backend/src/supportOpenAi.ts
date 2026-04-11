import OpenAI from "openai";
import type { Env } from "./config.js";
import { sanitizeUserMessageForLlm } from "./sanitizePrompt.js";

export async function runOpenAiSupport(env: Env, message: string): Promise<string> {
  const key = env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("openai_not_configured");
  }
  const safe = sanitizeUserMessageForLlm(message);
  const client = new OpenAI({ apiKey: key });
  const model = env.OPENAI_MODEL ?? "gpt-4o-mini";
  const res = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "Assistente de suporte ao aplicativo Onco (como usar o app, dúvidas gerais). Não forneça diagnóstico nem conduta médica. Responda em português do Brasil. Se houver sintomas graves ou emergência, oriente procurar pronto-socorro ou a equipe de saúde.",
      },
      { role: "user", content: safe },
    ],
    temperature: 0.2,
    max_tokens: 1200,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
