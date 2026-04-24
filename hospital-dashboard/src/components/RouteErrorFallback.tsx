"use client";

import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Client error boundary UI for Next.js `error.tsx` segments.
 */
export function RouteErrorFallback({ error, reset }: Props) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-lg flex-col gap-4 rounded-2xl border border-destructive/30 bg-card p-8 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-destructive">Algo correu mal</h2>
      <p className="text-sm text-muted-foreground">{error.message || "Erro inesperado."}</p>
      <Button type="button" onClick={() => reset()} className="w-fit rounded-xl">
        Tentar novamente
      </Button>
    </div>
  );
}
