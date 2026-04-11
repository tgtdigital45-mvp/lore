import type { InfusionSessionStatus, TreatmentKind } from "@/src/types/treatment";

export const treatmentKindLabel: Record<TreatmentKind, string> = {
  chemotherapy: "Quimioterapia",
  radiotherapy: "Radioterapia",
  hormone: "Hormonioterapia",
  immunotherapy: "Imunoterapia",
  other: "Outro",
};

export function labelTreatmentKind(key: string): string {
  return treatmentKindLabel[key as TreatmentKind] ?? key;
}

export const infusionStatusLabel: Record<InfusionSessionStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

export function labelInfusionStatus(key: string): string {
  return infusionStatusLabel[key as InfusionSessionStatus] ?? key;
}
