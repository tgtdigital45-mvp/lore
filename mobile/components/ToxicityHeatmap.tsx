import { Text, View } from "react-native";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import type { AppTheme } from "@/src/theme/theme";

const RANK: Record<string, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
  life_threatening: 4,
};

function colorForRank(r: number, theme: AppTheme) {
  if (r <= 1) return theme.colors.semantic.nutrition;
  if (r === 2) return theme.colors.semantic.respiratory;
  if (r === 3) return theme.colors.semantic.symptoms;
  return theme.colors.semantic.vitals;
}

type Log = { severity: string; logged_at: string };

export function ToxicityHeatmap({ logs }: { logs: Log[] }) {
  const { theme } = useAppTheme();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const byDay = new Map<string, number>();
  for (const day of days) byDay.set(day, 0);
  for (const l of logs) {
    const day = l.logged_at.slice(0, 10);
    if (!byDay.has(day)) continue;
    const prev = byDay.get(day) ?? 0;
    const next = Math.max(prev, RANK[l.severity] ?? 0);
    byDay.set(day, next);
  }

  return (
    <View style={{ marginTop: theme.spacing.md }}>
      <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Mapa rápido (7 dias)</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.sm }}>
        {days.map((day) => {
          const r = byDay.get(day) ?? 0;
          const bg = r === 0 ? theme.colors.background.tertiary : colorForRank(r, theme);
          return (
            <View key={day} style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  height: 36,
                  marginHorizontal: 2,
                  borderRadius: theme.radius.sm,
                  backgroundColor: bg,
                  width: "100%",
                }}
              />
              <Text style={{ fontSize: 10, color: theme.colors.text.secondary, marginTop: 4 }}>
                {new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
