import { X } from "lucide-react";
import type { SuspensionRiskFactor } from "@/lib/suspensionRisk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  factors: SuspensionRiskFactor[];
};

export function SuspensionFactorsModal({ open, onOpenChange, score, factors }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspension-factors-title"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn(
          "max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E8EAED] bg-white p-6 shadow-xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="suspension-factors-title" className="text-lg font-black tracking-tight">
              Fatores de risco de suspensão
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Heurística 0–100 (não substitui decisão médica). Score atual:{" "}
              <span className="font-bold text-[#EF4444]">{score}%</span>
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-muted-foreground hover:bg-[#F8FAFC]"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <ul className="space-y-4">
          {factors.map((f, i) => (
            <li
              key={`${f.label}-${i}`}
              className={cn(
                "rounded-2xl border px-4 py-3",
                f.points > 0 ? "border-amber-200 bg-[#FFFBEB]/80" : "border-[#E8EAED] bg-[#F8FAFC]/80"
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-foreground">{f.label}</span>
                {f.points > 0 ? (
                  <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">+{f.points} pts</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
              {f.detail ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.detail}</p> : null}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          A febre em vitais considera-se a partir de 37,8 °C (configuração de triagem). Janelas: 48h (temperatura), 72h
          (sintomas / VFC), 7 dias (quedas).
        </p>

        <Button type="button" variant="outline" className="mt-4 w-full rounded-2xl" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
