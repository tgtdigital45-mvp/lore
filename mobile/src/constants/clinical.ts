/** Alinhado ao enum cancer_type em Supabase e onboarding. */
export const CANCER_TYPES = ["breast", "lung", "prostate", "leukemia", "colorectal", "other"] as const;
export type CancerTypeId = (typeof CANCER_TYPES)[number];
