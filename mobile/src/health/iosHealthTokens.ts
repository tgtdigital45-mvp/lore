/** Alinhamento com UI do app Saúde (iOS) — refs em assets/health/rel/ */

export const IOS_HEALTH = {
  blue: "#007AFF",
  destructive: "#FF3B30",
  separator: "#C6C6C8",
  groupedListRadius: 10,
  cardRadiusLarge: 22,
  pillButtonRadius: 999,
  shadow: {
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    floatingControl: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 3,
    },
  },
} as const;
