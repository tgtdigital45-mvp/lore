import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type AppTheme } from "@/src/theme/theme";

export function useAppTheme(): { isDark: boolean; theme: AppTheme } {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return { isDark, theme: isDark ? darkTheme : lightTheme };
}
