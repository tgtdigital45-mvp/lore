import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

/** Vista TV / ecrã inteiro sem Loader2 central. */
export function InfusionDisplaySkeleton() {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/90 px-4 py-6 sm:px-6 lg:px-10"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <header className="relative mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <SkeletonPulse className="h-8 w-56" rounded="2xl" />
          <SkeletonPulse className="h-14 w-full max-w-xl" />
          <SkeletonPulse className="h-4 w-full max-w-2xl" />
        </div>
        <SkeletonPulse className="h-16 w-40 self-end" />
      </header>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-24 w-full" rounded="3xl" />
        ))}
      </div>
      <SkeletonPulse className="mb-10 h-32 w-full" rounded="3xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-44 w-full" rounded="3xl" />
        ))}
      </div>
      <span className="sr-only">Carregando painel de infusão</span>
    </div>
  );
}
