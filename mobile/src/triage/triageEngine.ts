/** Alinhado a `public.compute_symptom_triage_semaphore` (Supabase). */

export type TriageSemaphore = "green" | "yellow" | "red";

export type PrdPayload = {
  entry_kind: "prd";
  pain_level: number | null;
  nausea_level: number | null;
  fatigue_level: number | null;
};

export type LegacyPayload = {
  entry_kind: "legacy";
  severity: string | null;
  symptom_category: string | null;
  body_temperature: number | null;
};

export type AeFlowPayload = {
  entry_kind: "ae_flow";
  ae_max_grade: number;
};

/** Defaults alinhados ao servidor quando hospital não personaliza thresholds. */
const DEFAULT_CTCAE_YELLOW = 2;
const DEFAULT_CTCAE_RED = 3;

export function computeTriageSemaphore(row: PrdPayload | LegacyPayload | AeFlowPayload): TriageSemaphore {
  if (row.entry_kind === "ae_flow") {
    const g = row.ae_max_grade;
    if (g >= DEFAULT_CTCAE_RED) return "red";
    if (g >= DEFAULT_CTCAE_YELLOW) return "yellow";
    return "green";
  }
  if (row.entry_kind === "prd") {
    const mx = Math.max(row.pain_level ?? 0, row.nausea_level ?? 0, row.fatigue_level ?? 0);
    if (mx >= 8) return "red";
    if (mx >= 4) return "yellow";
    return "green";
  }
  const sev = row.severity ?? "";
  if (sev === "life_threatening" || sev === "severe") return "red";
  if (sev === "moderate") return "yellow";
  if (row.symptom_category === "fever" && row.body_temperature != null && Number.isFinite(Number(row.body_temperature))) {
    const temp = Number(row.body_temperature);
    if (temp >= 37.8) return "red";
    if (temp >= 37.3) return "yellow";
  }
  return "green";
}
