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

/** Nomes de protocolo genéricos / demo — preferir mostrar o tipo de tratamento (quimio, radio, …). */
export function isPlaceholderProtocolName(name: string | null | undefined): boolean {
  if (name == null || !String(name).trim()) return true;
  const n = String(name)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (n.includes("exemplo") || n.includes("example")) return true;
  if (n === "teste" || n === "demo") return true;
  if ((n.includes("catalogo") || n.includes("catálogo")) && (n.includes("exemplo") || n.includes("example"))) return true;
  return false;
}

export function labelCycleStatus(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "completed") return "Concluído";
  if (status === "suspended") return "Suspenso";
  return status;
}
