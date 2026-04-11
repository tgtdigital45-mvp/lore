/** Design tokens — docs/style-guide.md (Apple Health) */
export const lightTheme = {
  colors: {
    background: {
      primary: "#FFFFFF",
      secondary: "#F2F2F7",
      tertiary: "#E5E5EA",
    },
    text: {
      primary: "#000000",
      secondary: "#8E8E93",
      tertiary: "#C7C7CC",
    },
    border: { divider: "#E5E5EA" },
    semantic: {
      vitals: "#FF2D55",
      respiratory: "#32ADE6",
      nutrition: "#34C759",
      treatment: "#5E5CE6",
      symptoms: "#FF9500",
    },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24 },
  typography: {
    largeTitle: { fontSize: 34, fontWeight: "700" as const, lineHeight: 41 },
    title1: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
    title2: { fontSize: 22, fontWeight: "600" as const, lineHeight: 28 },
    headline: { fontSize: 17, fontWeight: "600" as const, lineHeight: 22 },
    body: { fontSize: 17, fontWeight: "400" as const, lineHeight: 22 },
    dataHuge: { fontSize: 44, fontWeight: "800" as const, lineHeight: 52 },
  },
};

export const darkTheme = {
  colors: {
    background: {
      primary: "#000000",
      secondary: "#1C1C1E",
      tertiary: "#2C2C2E",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#98989D",
      tertiary: "#48484A",
    },
    border: { divider: "#38383A" },
    semantic: lightTheme.colors.semantic,
  },
  spacing: lightTheme.spacing,
  radius: lightTheme.radius,
  typography: lightTheme.typography,
};

export type AppTheme = typeof lightTheme;
