import { Lock } from "lucide-react";
import type { TreatmentCycleRow } from "@/types/dashboard";
import { cn } from "@/lib/utils";

export type TreatmentJourneyBarProps = {
  cycles: TreatmentCycleRow[];
  className?: string;
};

type PhaseId = "diagnostico" | "quimio" | "radio" | "acompanhamento";

const PHASES: { id: PhaseId; label: string }[] = [
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "quimio", label: "Quimioterapia" },
  { id: "radio", label: "Radioterapia" },
  { id: "acompanhamento", label: "Acompanhamento" },
];

/**
 * Jornada do tratamento — barra horizontal com gradiente teal (estilo Dynamics).
 */
export function TreatmentJourneyBar({ cycles, className }: TreatmentJourneyBarProps) {
  const sorted = [...cycles].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const hasCycles = sorted.length > 0;
  const allCompleted = hasCycles && sorted.every((c) => c.status === "completed");

  function phaseState(id: PhaseId): "done" | "current" | "locked" | "future" {
    if (!hasCycles) {
      if (id === "diagnostico") return "current";
      if (id === "radio") return "locked";
      return "future";
    }
    if (allCompleted) {
      if (id === "diagnostico" || id === "quimio") return "done";
      if (id === "radio") return "locked";
      return "current";
    }
    if (id === "diagnostico") return "done";
    if (id === "quimio") return "current";
    if (id === "radio") return "locked";
    return "future";
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-3xl border border-white/60 bg-white/55 px-3 py-4 shadow-sm ring-1 ring-white/45 backdrop-blur-sm",
        className
      )}
    >
      <p className="mb-3 text-center text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">Jornada do tratamento</p>
      <div className="flex min-w-[min(100%,560px)] items-center justify-center gap-0">
        {PHASES.map((phase, i) => {
          const state = phaseState(phase.id);
          const isCurrent = state === "current";
          const isDone = state === "done";
          const isLocked = state === "locked";

          return (
            <div key={phase.id} className="flex min-w-0 flex-1 items-center">
              {i > 0 ? (
                <div
                  className={cn("h-0.5 min-w-[8px] flex-1 rounded-full", isDone || isCurrent ? "bg-teal-300" : "bg-slate-200")}
                  aria-hidden
                />
              ) : null}
              <div
                className={cn(
                  "flex w-full min-w-[4.5rem] items-center justify-center gap-1 rounded-full px-2 py-2 text-center text-[0.6rem] font-bold uppercase leading-tight tracking-wide transition-all duration-300 sm:min-w-[5.5rem] sm:px-3 sm:text-[0.65rem]",
                  isCurrent &&
                    "bg-gradient-to-r from-teal-400 to-teal-700 text-white shadow-[0_0_14px_rgba(20,184,166,0.4)]",
                  isDone && !isCurrent && "bg-teal-100 text-teal-900",
                  !isDone && !isCurrent && !isLocked && "border border-slate-200 bg-white text-slate-500",
                  isLocked && "border border-dashed border-slate-300 bg-slate-100 text-slate-400"
                )}
              >
                {isLocked ? <Lock className="size-3 shrink-0 opacity-70" aria-hidden /> : null}
                <span className="break-words">{phase.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
