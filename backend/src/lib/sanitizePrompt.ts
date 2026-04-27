/** Reduz risco de prompt injection em texto livre do utilizador (defesa em profundidade). */
const MAX_USER_INPUT_LEN = 8000;

export function sanitizeUserMessageForLlm(input: string): string {
  let s = input.slice(0, MAX_USER_INPUT_LEN);
  s = s
    .replace(/ignore\s+(all\s+)?(previous\s+)?instructions?/gi, "[filtered]")
    .replace(/\b(system|assistant)\s*:\s*/gi, "[filtered]:")
    .replace(/\byou\s+are\s+now\b/gi, "[filtered]")
    .replace(/<\|[^|]+\|>/g, "[filtered]");
  return s;
}
