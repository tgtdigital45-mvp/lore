/**
 * Compatível com componentes legados (Themed). Fonte única: `src/theme/theme.ts`.
 */
import { darkTheme, lightTheme } from "@/src/theme/theme";

const tintLight = lightTheme.colors.semantic.respiratory;
const tintDark = "#FFFFFF";

export default {
  light: {
    text: lightTheme.colors.text.primary,
    background: lightTheme.colors.background.primary,
    tint: tintLight,
    tabIconDefault: "#CCCCCC",
    tabIconSelected: tintLight,
  },
  dark: {
    text: darkTheme.colors.text.primary,
    background: darkTheme.colors.background.primary,
    tint: tintDark,
    tabIconDefault: "#CCCCCC",
    tabIconSelected: tintDark,
  },
};
