import { useWindowDimensions } from "react-native";

const TABLET_BREAKPOINT = 600;

/**
 * Telefone: margem lateral fixa (gutter).
 * Tablet: coluna central (max ~760px) para leitura confortável.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= TABLET_BREAKPOINT;
  const gutter = isTablet ? 24 : 16;
  const maxContentWidth = isTablet ? Math.min(760, width - gutter * 2) : undefined;

  return {
    width,
    height,
    isTablet,
    maxContentWidth,
    gutter,
  };
}
