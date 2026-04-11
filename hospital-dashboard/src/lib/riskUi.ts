import type { RiskRow } from "../types/dashboard";

export function riskFromRank(n: number, inNadir: boolean): { label: string; cls: string } {
  if (n >= 4) return { label: "Crítico", cls: "risk-critical" };
  if (n >= 3) return { label: "Alto", cls: "risk-high" };
  if (n >= 2) return { label: "Médio", cls: "risk-mid" };
  if (n >= 1) return { label: "Baixo", cls: "risk-low" };
  if (inNadir) return { label: "Nadir (vigilância)", cls: "risk-nadir" };
  return { label: "Sem registros recentes", cls: "risk-none" };
}

export function dotClassForRisk(cls: string): string {
  if (cls === "risk-critical") return "activity-dot activity-dot--critical";
  if (cls === "risk-high") return "activity-dot activity-dot--high";
  if (cls === "risk-mid") return "activity-dot activity-dot--mid";
  if (cls === "risk-low") return "activity-dot activity-dot--low";
  if (cls === "risk-nadir") return "activity-dot activity-dot--nadir";
  return "activity-dot activity-dot--none";
}

export function triageEstadoChat(r: RiskRow): { label: string; cls: string } {
  if (r.risk >= 4 || r.hasClinicalAlert) return { label: "Crítico", cls: "risk-critical" };
  if (r.risk >= 1 || r.is_in_nadir) return { label: "Estável", cls: "risk-mid" };
  return { label: "Normal", cls: "risk-low" };
}

export function pillClassForSeverity(sev: string): string {
  if (sev === "life_threatening") return "risk-critical";
  if (sev === "severe") return "risk-high";
  if (sev === "moderate") return "risk-mid";
  if (sev === "mild") return "risk-low";
  return "risk-none";
}
