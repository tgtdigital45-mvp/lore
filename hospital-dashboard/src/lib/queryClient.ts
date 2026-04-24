import { QueryClient } from "@tanstack/react-query";

/**
 * Tempos calibrados para o dashboard hospitalar:
 * - staleTime: 3 min  → dados clínicos não mudam a cada segundo; evita re-fetch desnecessário ao focar a janela.
 * - gcTime: 10 min    → mantém cache em memória por 10 min após desmontagem (navegação entre rotas).
 * - refetchOnWindowFocus: só para dados críticos (alertas / triagem) — configurado por query com refetchInterval.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 3 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof Error && error.message.includes("403")) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
    },
  });
}
