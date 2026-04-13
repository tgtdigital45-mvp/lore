import { SYMPTOM_NAV_ITEMS, type SymptomDetailKey } from "@/src/diary/symptomCatalog";
import { BREAST_SYMPTOM_FOCUS } from "@/src/diary/symptomModules/breastCancer";
import { IMMUNOTHERAPY_SYMPTOM_FOCUS } from "@/src/diary/symptomModules/immunotherapy";
import { LUNG_SYMPTOM_FOCUS } from "@/src/diary/symptomModules/lungCancer";
import type { TreatmentKind } from "@/src/types/treatment";

function uniqueById(order: SymptomDetailKey[]): SymptomDetailKey[] {
  const seen = new Set<SymptomDetailKey>();
  const out: SymptomDetailKey[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Prioriza sintomas alinhados à patologia / imunoterapia; mantém o catálogo completo sem duplicar. */
export function orderedSymptomNavItems(
  primaryCancerType: string | null | undefined,
  activeTreatmentKind: TreatmentKind | null | undefined
): readonly { id: SymptomDetailKey; label: string }[] {
  const all = [...SYMPTOM_NAV_ITEMS];
  const byId = new Map(all.map((x) => [x.id, x] as const));

  let priority: SymptomDetailKey[] = [];
  if (activeTreatmentKind === "immunotherapy") {
    priority = [...IMMUNOTHERAPY_SYMPTOM_FOCUS];
  }
  if (primaryCancerType === "breast") {
    priority = [...BREAST_SYMPTOM_FOCUS, ...priority];
  } else if (primaryCancerType === "lung") {
    priority = [...LUNG_SYMPTOM_FOCUS, ...priority];
  }

  priority = uniqueById(priority);
  const restIds = all.map((x) => x.id).filter((id) => !priority.includes(id));
  const orderedIds = [...priority, ...restIds];
  return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
}
