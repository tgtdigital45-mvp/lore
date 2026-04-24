"use client";

import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function OperacaoInfusaoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} />;
}
