import type { TreatmentCycleRow, TreatmentInfusionRow } from "../types/dashboard";
import { formatPtShort } from "./dashboardFormat";

export type ClinicalNadirSummary = {
  activeCycle: TreatmentCycleRow | null;
  lastCompletedInfusionAt: string | null;
  /** Janela estimada pós-última infusão onde o nadir costuma ocorrer (dias 7–14). */
  estimatedNadirWindowLabel: string;
  /** Próxima data provável de infusão com base no intervalo do protocolo. */
  predictedNextInfusionLabel: string;
};

function pickActiveCycle(cycles: TreatmentCycleRow[]): TreatmentCycleRow | null {
  if (cycles.length === 0) return null;
  const sorted = [...cycles].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  return sorted.find((c) => c.status === "active") ?? sorted[0] ?? null;
}

export function computeClinicalNadirSummary(
  cycles: TreatmentCycleRow[],
  infusions: TreatmentInfusionRow[]
): ClinicalNadirSummary {
  const activeCycle = pickActiveCycle(cycles);
  const completed = infusions.filter((i) => i.status === "completed");
  const lastCompletedInfusionAt =
    completed.length > 0
      ? completed.reduce((best, cur) => (new Date(cur.session_at) > new Date(best.session_at) ? cur : best)).session_at
      : activeCycle?.last_session_at ?? null;

  let estimatedNadirWindowLabel = "—";
  if (lastCompletedInfusionAt) {
    const t = new Date(lastCompletedInfusionAt);
    const start = new Date(t);
    start.setDate(start.getDate() + 7);
    const end = new Date(t);
    end.setDate(end.getDate() + 14);
    estimatedNadirWindowLabel = `${formatPtShort(start.toISOString())} – ${formatPtShort(end.toISOString())} (estim.)`;
  }

  let predictedNextInfusionLabel = "—";
  const interval = activeCycle?.infusion_interval_days ?? null;
  if (lastCompletedInfusionAt && interval && interval > 0) {
    const d = new Date(lastCompletedInfusionAt);
    d.setDate(d.getDate() + interval);
    predictedNextInfusionLabel = formatPtShort(d.toISOString());
  }

  return {
    activeCycle,
    lastCompletedInfusionAt,
    estimatedNadirWindowLabel,
    predictedNextInfusionLabel,
  };
}

/** Primeira sessão de infusão do ciclo (por data), para o cabeçalho do dossiê. */
export function firstInfusionSessionAtInCycle(
  activeCycle: TreatmentCycleRow | null,
  infusions: TreatmentInfusionRow[]
): string | null {
  if (!activeCycle) return null;
  const rows = infusions
    .filter((i) => i.cycle_id === activeCycle.id)
    .sort((a, b) => new Date(a.session_at).getTime() - new Date(b.session_at).getTime());
  return rows[0]?.session_at ?? null;
}

/** Janela de vigilância (dias 7–14 após a data de referência), usando datas em UTC — alinhado ao cálculo no Postgres. */
export function computeIsInClinicalNadirWindow(
  cycles: TreatmentCycleRow[],
  infusions: TreatmentInfusionRow[],
  now: Date = new Date()
): boolean {
  const { lastCompletedInfusionAt } = computeClinicalNadirSummary(cycles, infusions);
  if (!lastCompletedInfusionAt) return false;
  const t = new Date(lastCompletedInfusionAt);
  const refDay = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = refDay + 7 * 86400000;
  const end = refDay + 14 * 86400000;
  return nowDay >= start && nowDay <= end;
}

export function cancerContextHint(primaryCancerType: string): string {
  const t = primaryCancerType.toLowerCase();
  if (t.includes("breast") || t.includes("mama")) return "Ênfase: linfedema, pele, dor local.";
  if (t.includes("lung") || t.includes("pulm")) return "Ênfase: SpO₂, dispneia, tosse.";
  if (t.includes("colo") || t.includes("cervix")) return "Ênfase: sangramento, dor pélvica.";
  return "Monitorizar toxicidade e sinais de alerta gerais.";
}
