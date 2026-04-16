import type { HomeSummarySnapshot } from "@/src/home/homeSummaryTypes";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isTuplePair(x: unknown): x is [unknown, unknown] {
  return Array.isArray(x) && x.length === 2;
}

/** Valida JSON devolvido por `rpc_mobile_home_summary` antes de usar no cliente. */
export function parseHomeSummaryRpcPayload(data: unknown): HomeSummarySnapshot | null {
  if (!isRecord(data)) return null;
  if (typeof data.profileName !== "string") return null;
  if (!("profileAvatarUrl" in data)) return null;
  if (!Array.isArray(data.biomarkerByNormEntries)) return null;
  if (!Array.isArray(data.lastBySymptomEntries)) return null;
  if (!Array.isArray(data.latestVitalByTypeEntries)) return null;
  if (!Array.isArray(data.nutritionRows)) return null;
  if (typeof data.hasBiopsy !== "boolean") return null;

  for (const e of data.biomarkerByNormEntries) {
    if (!isTuplePair(e)) return null;
  }
  for (const e of data.lastBySymptomEntries) {
    if (!isTuplePair(e)) return null;
  }
  for (const e of data.latestVitalByTypeEntries) {
    if (!isTuplePair(e)) return null;
  }

  return data as unknown as HomeSummarySnapshot;
}
