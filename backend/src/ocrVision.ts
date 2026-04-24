import type { Env } from "./config.js";
import type { DocKind, OcrVisionOutcome } from "./ocrGemini.js";
import { runGeminiOcrVision } from "./ocrGemini.js";
import { openAiOcrSupportsMime, runOpenAiOcrVision } from "./ocrOpenAi.js";

/**
 * Primário: Gemini (foto + PDF). Se falhar (quota, 503, chave inválida/expirada, etc.),
 * suporte: OpenAI com foto ou PDF em base64.
 */
export function shouldUseOpenAiOcrFallback(geminiMessage: string): boolean {
  const m = geminiMessage.toLowerCase();
  return (
    m.includes("503") ||
    m.includes("service unavailable") ||
    m.includes("429") ||
    m.includes("resource exhausted") ||
    m.includes("resource has been exhausted") ||
    m.includes("unavailable") ||
    m.includes("high demand") ||
    m.includes("overload") ||
    m.includes("try again later") ||
    m.includes("overloaded") ||
    m.includes("quota") ||
    m.includes("billing") ||
    m.includes("exceeded") ||
    m.includes("insufficient") ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("limit exceeded") ||
    m.includes("payment required") ||
    m.includes("tokens") ||
    m.includes("credit") ||
    // Chave inválida / revogada / API desativada (respostas típicas da API Google)
    m.includes("api_key_invalid") ||
    m.includes("api key not valid") ||
    m.includes("invalid api key") ||
    m.includes("permission_denied") ||
    m.includes("forbidden") ||
    m.includes("disabled") ||
    m.includes("not enabled") ||
    m.includes("key expired") ||
    m.includes("key has expired")
  );
}

/** Regra: primeiro Gemini 3 Flash Preview; se falhar por quota/sobrecarga (etc.), GPT-4o mini (imagem ou PDF). */
export async function runOcrVision(
  env: Env,
  mimeType: string,
  base64Data: string,
  options?: { hintDocumentType?: DocKind }
): Promise<OcrVisionOutcome> {
  try {
    return await runGeminiOcrVision(env, mimeType, base64Data, options);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = err.message;
    if (!shouldUseOpenAiOcrFallback(msg)) {
      throw err;
    }
    if (!env.OPENAI_API_KEY) {
      console.warn("[ocr] Falha no Gemini e OPENAI_API_KEY ausente; sem fallback OpenAI.");
      throw err;
    }
    if (!openAiOcrSupportsMime(mimeType)) {
      console.warn(`[ocr] MIME sem fallback OpenAI (${mimeType}); a propagar erro Gemini.`);
      throw err;
    }
    console.warn("[ocr] Fallback OCR via OpenAI (gpt-4o-mini) após falha do Gemini.");
    return await runOpenAiOcrVision(env, mimeType, base64Data, options);
  }
}
