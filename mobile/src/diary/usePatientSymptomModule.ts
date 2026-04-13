import { orderedSymptomNavItems } from "@/src/diary/symptomModules/ordering";
import type { TreatmentKind } from "@/src/types/treatment";

export function usePatientSymptomModule(
  primaryCancerType: string | null | undefined,
  activeTreatmentKind: TreatmentKind | null | undefined
) {
  return orderedSymptomNavItems(primaryCancerType, activeTreatmentKind ?? null);
}
