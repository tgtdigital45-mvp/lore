"use client";

import "@/index.css";
import "@/App.css";
import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background p-6 antialiased">
        <RouteErrorFallback error={error} reset={reset} />
      </body>
    </html>
  );
}
