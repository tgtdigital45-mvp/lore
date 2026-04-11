import { useNavigation } from "@react-navigation/native";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Volta apenas no stack do navigator atual (ex.: fluxo da mesma aba).
 * Prefira isto a `router.back()`, que pode percorrer histórico global entre abas.
 */
export function useStackBack(fallbackHref: Href) {
  const navigation = useNavigation();
  const router = useRouter();

  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace(fallbackHref);
    }
  }, [navigation, router, fallbackHref]);
}
