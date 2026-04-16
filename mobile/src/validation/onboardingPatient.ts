import { z } from "zod";

const cancerEnum = z.enum(["breast", "lung", "prostate", "leukemia", "colorectal", "other"]);

/** Payload enviado ao Supabase em `patients.insert` (onboarding paciente). */
export const onboardingPatientInsertSchema = z.object({
  profile_id: z.string().uuid(),
  primary_cancer_type: cancerEnum,
  current_stage: z.string().max(2000).nullable(),
  hospital_id: z.string().uuid(),
});

export type OnboardingPatientInsert = z.infer<typeof onboardingPatientInsertSchema>;
