import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import type { Env } from "./config.js";
import {
  OCR_INSTRUCTION,
  parseOcrModelJsonText,
  type DocKind,
  type OcrVisionOutcome,
} from "./ocrGemini.js";

/**
 * Fallback OpenAI (mesmos casos que o Gemini no pipeline): fotos e PDF em base64.
 * PDF usa `type: file` + file_data; imagens usam `image_url` com data URL.
 */
const OPENAI_OCR_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
]);

export function openAiOcrSupportsMime(mime: string): boolean {
  return OPENAI_OCR_MIMES.has(mime);
}

function buildUserContentParts(
  mimeType: string,
  base64Data: string,
  userText: string
): ChatCompletionContentPart[] {
  const textPart: ChatCompletionContentPart = { type: "text", text: userText };
  if (mimeType === "application/pdf") {
    return [
      textPart,
      {
        type: "file",
        file: {
          filename: "document.pdf",
          file_data: base64Data,
        },
      },
    ];
  }
  return [
    textPart,
    {
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`,
      },
    },
  ];
}

/** Mesmo schema lógico do Gemini; modelo padrão gpt-4o-mini (`OPENAI_MODEL`). */
export async function runOpenAiOcrVision(
  env: Env,
  mimeType: string,
  base64Data: string,
  options?: { hintDocumentType?: DocKind }
): Promise<OcrVisionOutcome> {
  const key = env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("openai_not_configured");
  }
  if (!openAiOcrSupportsMime(mimeType)) {
    throw new Error(`openai_ocr_mime_not_supported:${mimeType}`);
  }
  const model = env.OPENAI_MODEL ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey: key });
  const hint = options?.hintDocumentType;
  const userText = hint
    ? `O sistema já indicou o tipo clínico: ${hint}. Se document_suitability for "clinical_exam", o campo document_kind na resposta JSON deve ser exatamente "${hint}". markers_json como string JSON de objeto; metrics_json como string JSON de array; professional_registries_json como string JSON de array (objetos {kind, number, uf?} para CRM/CRO/COREN/CRF ou []). Responda apenas um objeto JSON com: summary_pt_br, exam_date_iso, title_pt_br, doctor_name, professional_registries_json, markers_json, metrics_json, confidence_note, document_suitability, document_kind, ui_category.`
    : `Defina document_suitability primeiro. markers_json, metrics_json e professional_registries_json como strings JSON. Responda apenas um objeto JSON com: summary_pt_br, exam_date_iso, title_pt_br, doctor_name, professional_registries_json, markers_json, metrics_json, confidence_note, document_suitability, document_kind, ui_category.`;

  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: OCR_INSTRUCTION },
      {
        role: "user",
        content: buildUserContentParts(mimeType, base64Data, userText),
      },
    ],
  });

  const text = res.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("openai_ocr_empty_response");
  }
  return parseOcrModelJsonText(text, { hintDocumentType: hint, logContext: `openai:${model}` });
}
