const FEVER_KEYWORDS = /febre|calafrio|calafrios|febrile|temperatura/i;

export function extractTemperature(text: string): number | undefined {
  const m = text.match(/(\d{1,2})([.,])(\d)\s*°?\s*c/i);
  if (m) return parseFloat(`${m[1]}.${m[3]}`);
  const m2 = text.match(/(\d{1,2})\s*°\s*c/i);
  if (m2) return parseFloat(m2[1]);
  return undefined;
}

export type NadirFeverEval = {
  severeFever: boolean;
  tempFromText: number | undefined;
  feverByTemp: boolean;
  feverByKeywords: boolean;
};

/** Neutropenia febril rule: nadir + (T ≥ 37.8°C OR fever keywords). */
export function evaluateNadirFeverEmergency(message: string, isInNadir: boolean): NadirFeverEval {
  const tempFromText = extractTemperature(message);
  const feverByTemp = tempFromText !== undefined && tempFromText >= 37.8;
  const feverByKeywords = FEVER_KEYWORDS.test(message);
  const severeFever = isInNadir && (feverByTemp || feverByKeywords);
  return { severeFever, tempFromText, feverByTemp, feverByKeywords };
}
