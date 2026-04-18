import { createContext, useContext } from "react";

/**
 * Espaço extra no fundo do conteúdo (`ResponsiveScreen`) para o scroll não ficar
 * por baixo da barra em pílula + orb. Somamos a `insets.bottom`.
 *
 * Valores positivos. O valor antigo (-70) reduzia o padding e em Android
 * (edge-to-edge, gestos, `insets` variáveis) o conteúdo e o gradiente pareciam
 * “sem revitalização” — a pílula tapava texto e a barra podia ficar atrás do scroll.
 */
/** Folga extra além do safe area para o conteúdo não ficar por baixo da pílula + orb (iOS e Android). */
export const FLOATING_TAB_BAR_BOTTOM_CLEARANCE = -70;

/** Fundo da cena + barra nativa + container da pílula — sem cor sólida para o gradiente do conteúdo aparecer. */
export const FLOATING_TAB_BAR_SURFACE_TRANSPARENT = "transparent" as const;

export const TabBarInsetContext = createContext<number>(FLOATING_TAB_BAR_BOTTOM_CLEARANCE);

export function useTabBarBottomInset(): number {
  return useContext(TabBarInsetContext);
}
