import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

export function AgendaSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-12" role="status" aria-busy="true" aria-live="polite">
      <div className="space-y-6 border-b border-border pb-6">
        <SkeletonPulse className="h-4 w-40" />
        <SkeletonPulse className="h-10 w-64 max-w-full" />
        <SkeletonPulse className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-36 w-full" rounded="3xl" />
        ))}
      </div>
      <span className="sr-only">Carregando agenda</span>
    </div>
  );
}
