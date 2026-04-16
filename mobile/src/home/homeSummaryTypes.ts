import type { TreatmentCycleRow } from "@/src/types/treatment";
import type { NutritionLogRow, VitalLogRow, VitalType } from "@/src/types/vitalsNutrition";

export type { TreatmentCycleRow };

export type BiomarkerLatest = { name: string; value: string; unit: string | null; logged_at: string };

export type SymptomSnippet = {
  id: string;
  entry_kind?: string;
  symptom_category: string | null;
  severity: string | null;
  pain_level?: number | null;
  nausea_level?: number | null;
  fatigue_level?: number | null;
  body_temperature: number | null;
  logged_at: string;
};

export type NextAppointmentSnippet = {
  title: string;
  starts_at: string;
  kind: "consult" | "exam" | "other" | "infusion";
};

/** Serializable snapshot for TanStack Query cache (Maps rebuilt on read). */
export type HomeSummarySnapshot = {
  profileName: string;
  profileAvatarUrl: string | null;
  activeCycle: TreatmentCycleRow | null;
  biomarkerByNormEntries: [string, BiomarkerLatest][];
  lastBySymptomEntries: [string, SymptomSnippet][];
  latestVitalByTypeEntries: [VitalType, VitalLogRow][];
  nutritionRows: NutritionLogRow[];
  hasBiopsy: boolean;
  lastDoc: { document_type: string; uploaded_at: string } | null;
  latestSymptom: SymptomSnippet | null;
  nextAppointment: NextAppointmentSnippet | null;
};

export function snapshotToMaps(s: HomeSummarySnapshot): {
  biomarkerByNorm: Map<string, BiomarkerLatest>;
  lastBySymptom: Map<string, SymptomSnippet>;
  latestVitalByType: Map<VitalType, VitalLogRow>;
} {
  return {
    biomarkerByNorm: new Map(s.biomarkerByNormEntries),
    lastBySymptom: new Map(s.lastBySymptomEntries),
    latestVitalByType: new Map(s.latestVitalByTypeEntries),
  };
}
