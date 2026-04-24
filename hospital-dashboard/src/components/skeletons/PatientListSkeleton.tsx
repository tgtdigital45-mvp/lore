import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

export function PatientListSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4" role="status" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonPulse className="h-10 w-48" />
        <SkeletonPulse className="h-10 w-full max-w-md sm:w-80" rounded="xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-16 w-full" rounded="2xl" />
        ))}
      </div>
      <span className="sr-only">Carregando lista de pacientes</span>
    </div>
  );
}
