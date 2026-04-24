import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

export function MensagensSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
      <SkeletonPulse className="h-24 w-full max-w-2xl" rounded="2xl" />
      <SkeletonPulse className="h-10 w-full max-w-xl" rounded="xl" />
      <SkeletonPulse className="h-24 w-full" rounded="2xl" />
      <SkeletonPulse className="h-10 w-40" rounded="xl" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonPulse key={i} className="h-16 w-full" rounded="2xl" />
        ))}
      </div>
      <span className="sr-only">Carregando mensagens</span>
    </div>
  );
}
