import type { TreatmentCycleRow } from "@/types/dashboard";
import { cn } from "@/lib/utils";

export type PatientTreatmentStepperProps = {
  cycles: TreatmentCycleRow[];
  /** Ciclo em curso (ou o mais recente), vindo de `computeClinicalNadirSummary`. */
  activeCycle: TreatmentCycleRow | null;
};

type PillState = "done" | "current" | "future";

function pillClass(state: PillState): string {
  if (state === "done") return "rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-800";
  if (state === "current")
    return "rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white ring-2 ring-slate-900/20 shadow-sm";
  return "rounded-full border border-slate-200 bg-transparent px-4 py-1.5 text-xs font-medium text-slate-400";
}

/**
 * Linha do tempo horizontal: Triagem → Ciclo 1…N → Manutenção (quando há ciclos).
 * Apresentação apenas; estados derivados de `cycles` e `activeCycle`.
 */
export function PatientTreatmentStepper({ cycles, activeCycle }: PatientTreatmentStepperProps) {
  const sorted = [...cycles].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
  const hasTreatment = sorted.length > 0;
  const activeIx = activeCycle ? sorted.findIndex((x) => x.id === activeCycle.id) : -1;

  type Step = { key: string; label: string; kind: "triagem" | "ciclo" | "manutencao" };
  const steps: Step[] = [{ key: "triagem", label: "Triagem", kind: "triagem" }];
  sorted.forEach((c, i) => {
    steps.push({ key: c.id, label: `Ciclo ${i + 1}`, kind: "ciclo" });
  });
  if (hasTreatment) {
    steps.push({ key: "manutencao", label: "Manutenção", kind: "manutencao" });
  }

  function pillState(stepIndex: number): PillState {
    const step = steps[stepIndex];
    if (!step) return "future";

    if (step.kind === "triagem") {
      return hasTreatment ? "done" : "current";
    }

    if (step.kind === "ciclo") {
      const ci = stepIndex - 1;
      const c = sorted[ci];
      if (!c) return "future";
      if (activeIx >= 0) {
        if (ci < activeIx) return "done";
        if (ci === activeIx) return "current";
        return "future";
      }
      return c.status === "completed" ? "done" : "future";
    }

    // manutenção
    if (activeIx >= 0) return "future";
    const allCompleted = sorted.length > 0 && sorted.every((c) => c.status === "completed");
    return allCompleted ? "current" : "future";
  }

  function connectorClass(afterStepIndex: number): string {
    const done = pillState(afterStepIndex) === "done";
    return cn("h-0.5 min-w-[0.75rem] flex-1 shrink", done ? "bg-emerald-200" : "bg-slate-200");
  }

  if (steps.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-1 pt-1 [scrollbar-gutter:stable]">
      <div className="flex min-w-0 items-center">
        {steps.map((step, i) => (
          <div key={step.key} className="flex min-w-0 flex-1 items-center">
            {i > 0 ? <div className={connectorClass(i - 1)} aria-hidden /> : null}
            <span
              className={cn("shrink-0 whitespace-nowrap", pillClass(pillState(i)))}
              title={step.label}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
