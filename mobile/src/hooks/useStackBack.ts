import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Retorna à aba/página anterior usando o histórico global seguro.
 * Caso não haja histórico (ex.: deep link direto), utiliza o fallbackHref.
 */
export function useStackBack(fallbackHref: Href) {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  }, [router, fallbackHref]);
}
