import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VitalLogRow } from "../../types/dashboard";
import { formatPtDateTime } from "../../lib/dashboardFormat";

type Pt = { t: number; temp: number; label: string };

export function TemperatureAreaChart({ vitals }: { vitals: VitalLogRow[] }) {
  const data = useMemo(() => {
    const pts = vitals
      .filter((v) => v.vital_type === "temperature" && v.value_numeric != null && Number.isFinite(v.value_numeric))
      .map((v) => ({
        t: new Date(v.logged_at).getTime(),
        temp: v.value_numeric as number,
        label: formatPtDateTime(v.logged_at),
      }))
      .sort((a, b) => a.t - b.t);
    return pts as Pt[];
  }, [vitals]);

  if (data.length === 0) {
    return <p className="muted">Sem temperatura registada neste período.</p>;
  }

  return (
    <div className="w-full min-w-0 overflow-hidden" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4D4D" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#FF4D4D" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts) =>
              new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
            }
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 10 }}
            width={40}
            unit=" °C"
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)} °C`, "Temp."]}
            labelFormatter={(_, payload) => (payload[0]?.payload as Pt | undefined)?.label ?? ""}
          />
          <Area type="monotone" dataKey="temp" stroke="#FF4D4D" fill="url(#tempFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
