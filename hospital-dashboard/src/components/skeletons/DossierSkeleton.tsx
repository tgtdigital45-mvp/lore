import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

/** Espelha cabeçalho do dossiê, faixa de tabs e área principal (evita CLS). */
export function DossierSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-4 sm:p-6" role="status" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-10 w-full max-w-md" />
          <SkeletonPulse className="h-4 w-full max-w-lg" />
          <SkeletonPulse className="h-4 w-2/3 max-w-md" />
        </div>
        <div className="flex shrink-0 gap-2">
          <SkeletonPulse className="h-10 w-28" rounded="xl" />
          <SkeletonPulse className="h-10 w-36" rounded="xl" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-9 w-24" rounded="xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <SkeletonPulse className="h-64 w-full" rounded="3xl" />
          <SkeletonPulse className="h-48 w-full" rounded="3xl" />
        </div>
        <div className="space-y-4 lg:col-span-4">
          <SkeletonPulse className="h-40 w-full" rounded="3xl" />
          <SkeletonPulse className="h-32 w-full" rounded="3xl" />
        </div>
      </div>
      <span className="sr-only">Carregando dossiê</span>
    </div>
  );
}
