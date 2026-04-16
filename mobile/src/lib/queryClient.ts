import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      /** Com `OnlineManagerBridge` + NetInfo, refetch automático ao recuperar rede. */
      refetchOnReconnect: true,
      /** Com `focusManager` (AppState), refetch ao voltar à app em primeiro plano. */
      refetchOnWindowFocus: true,
    },
  },
});
