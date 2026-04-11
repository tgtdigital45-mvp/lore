import { createContext, useContext } from "react";

/**
 * Espaço reservado acima da barra flutuante (pílula + busca), além do safe area inferior.
 * Ajuste se mudar altura do `FloatingPillTabBar`.
 */
export const FLOATING_TAB_BAR_EXTRA = 78;

export const TabBarInsetContext = createContext<number>(0);

export function useTabBarBottomInset(): number {
  return useContext(TabBarInsetContext);
}
