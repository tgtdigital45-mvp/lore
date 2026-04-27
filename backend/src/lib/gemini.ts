import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Env } from "./config.js";
import { sanitizeUserMessageForLlm } from "./sanitizePrompt.js";

const SYSTEM_INSTRUCTION = `You are the Onco clinical support assistant (SaMD). Rules from docs/diretrizes-corportamento.md:
- NEVER diagnose, prescribe, or claim tumor progression/regression.
- Be empathetic, factual, calm, encouraging — not toxic positivity.
- You may explain terms, organize information, and support symptom triage.
- If unsure, ask the user to contact their care team.
- Output MUST be a single JSON object only, no markdown.`;

export type AgentStructured = {
  assistant_message: string;
  log_symptom: null | {
    symptom_category: string;
    severity: "mild" | "moderate" | "severe" | "life_threatening";
    body_temperature?: number | null;
    notes?: string | null;
  };
};

export async function runGeminiTriagem(
  env: Env,
  userMessage: string,
  contextJson: Record<string, unknown>
): Promise<AgentStructured> {
  const safeUser = sanitizeUserMessageForLlm(userMessage);
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL ?? "gemini-3-flash-preview",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          assistant_message: { type: SchemaType.STRING },
          log_symptom: {
            type: SchemaType.OBJECT,
            nullable: true,
            properties: {
              symptom_category: { type: SchemaType.STRING },
              severity: {
                type: SchemaType.STRING,
                enum: ["mild", "moderate", "severe", "life_threatening"],
              },
              body_temperature: { type: SchemaType.NUMBER, nullable: true },
              notes: { type: SchemaType.STRING, nullable: true },
            },
            required: ["symptom_category", "severity"],
          },
        },
        required: ["assistant_message", "log_symptom"],
      },
    },
  });

  const prompt = `Patient context (JSON):\n${JSON.stringify(contextJson)}\n\nUser message:\n${safeUser}\n\nIf the user describes how they feel today, propose log_symptom with appropriate category (e.g. nausea, fever, fatigue) and severity. Otherwise set log_symptom to null.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as AgentStructured;
  if (typeof parsed.assistant_message !== "string" || parsed.assistant_message.length > 12000) {
    throw new Error("invalid_llm_output");
  }
  return parsed;
}
