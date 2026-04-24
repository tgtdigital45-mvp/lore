import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

/** Lista de exames + bloco de gráficos. */
export function ExamesSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap gap-2">
        <SkeletonPulse className="h-10 flex-1 min-w-[140px]" rounded="xl" />
        <SkeletonPulse className="h-10 w-32" rounded="xl" />
      </div>
      <SkeletonPulse className="h-48 w-full" rounded="3xl" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
            <SkeletonPulse className="size-10 shrink-0" rounded="xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonPulse className="h-4 w-3/5 max-w-xs" />
              <SkeletonPulse className="h-3 w-2/5 max-w-[200px]" />
            </div>
            <SkeletonPulse className="h-8 w-20 shrink-0" rounded="xl" />
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando exames</span>
    </div>
  );
}
