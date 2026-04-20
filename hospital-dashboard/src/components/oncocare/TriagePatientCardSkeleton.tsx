import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { cn } from "@/lib/utils";

/**
 * Reserva espaço com dimensões próximas de {@link TriagePatientCard} para reduzir CLS.
 */
export function TriagePatientCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card",
        "min-h-[300px] w-full max-w-full",
        className
      )}
      aria-hidden
    >
      <div className="h-1 w-full shrink-0 bg-slate-100" />
      <div className="p-4">
        <div className="flex gap-3">
          <SkeletonPulse rounded="2xl" className="h-12 w-12 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <SkeletonPulse rounded="xl" className="h-4 w-[55%] max-w-[14rem]" />
              <SkeletonPulse rounded="xl" className="h-5 w-16" />
              <SkeletonPulse rounded="xl" className="h-5 w-14" />
            </div>
            <SkeletonPulse rounded="xl" className="h-3 w-2/3 max-w-xs" />
            <SkeletonPulse rounded="xl" className="h-3 w-1/2 max-w-[12rem]" />
          </div>
          <SkeletonPulse rounded="2xl" className="size-11 shrink-0" />
        </div>
        <div className="mt-2 flex justify-end">
          <SkeletonPulse rounded="xl" className="h-3 w-28" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-surface-muted/50 p-2">
          <SkeletonPulse rounded="xl" className="h-16 w-full" />
          <SkeletonPulse rounded="xl" className="h-16 w-full" />
          <SkeletonPulse rounded="xl" className="h-16 w-full" />
        </div>
        <div className="mt-3 flex justify-end border-t border-slate-100/80 pt-3">
          <SkeletonPulse rounded="xl" className="h-8 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}
