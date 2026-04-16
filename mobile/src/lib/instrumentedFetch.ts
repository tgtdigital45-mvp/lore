import { addFetchBreadcrumb, captureFetchFailure } from "@/src/lib/sentry";

/**
 * `fetch` para chamadas críticas ao API Express (exames, agente) com breadcrumb e captura de falhas de rede.
 */
export async function instrumentedFetch(input: string, init?: RequestInit, label?: string): Promise<Response> {
  const name = label ?? input;
  addFetchBreadcrumb(name, { method: init?.method ?? "GET" });
  try {
    return await fetch(input, init);
  } catch (e) {
    captureFetchFailure(name, e, { url: input });
    throw e;
  }
}
