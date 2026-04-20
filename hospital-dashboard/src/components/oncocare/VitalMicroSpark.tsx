import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

const SPARK_H = 44;
const STROKE_ORANGE = "#f97316";
const DOT_BLACK = "#0a0a0a";

type Props = {
  data: { iso: string; v: number }[];
  /** Cor do valor numérico (semântica: febre, SpO₂, etc.). */
  color: string;
  unit?: string;
  label: string;
};

/** Uma leitura só: duplica o ponto para desenhar segmento estável com o mesmo estilo. */
function buildChartRows(data: { iso: string; v: number }[]): { i: number; v: number }[] {
  const base = data.map((d, idx) => ({ i: idx, v: d.v }));
  if (base.length === 1) {
    return [
      { i: 0, v: base[0].v },
      { i: 1, v: base[0].v },
    ];
  }
  return base;
}

export function VitalMicroSpark({ data, color, unit, label }: Props) {
  const chartData = useMemo(() => buildChartRows(data), [data]);
  const last = data.length > 0 ? data[data.length - 1].v : null;
  const n = chartData.length;
  const showChart = data.length >= 1;

  return (
    <div className="min-w-0 flex flex-1 flex-col gap-0.5">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-bold tabular-nums leading-tight" style={{ color }}>
        {last != null ? last.toFixed(last >= 10 ? 0 : 1) : "—"}
        {unit ? <span className="text-[0.65rem] font-medium text-muted-foreground"> {unit}</span> : null}
      </span>
      <div className="h-11 w-full min-w-0 overflow-hidden rounded-md bg-slate-50/80 ring-1 ring-slate-100/90">
        {showChart && n >= 2 ? (
          <ResponsiveContainer width="100%" height={SPARK_H}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 6, left: 2, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <YAxis hide domain={["auto", "auto"]} />
              <Line
                type="natural"
                dataKey="v"
                stroke={STROKE_ORANGE}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={(props: { cx?: number; cy?: number; index?: number }) => {
                  const { cx, cy, index } = props;
                  if (cx == null || cy == null || index == null) return null;
                  if (index !== n - 1) return null;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      fill={DOT_BLACK}
                      stroke="#ffffff"
                      strokeWidth={1.25}
                    />
                  );
                }}
                activeDot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-11 items-center justify-center px-1 text-center text-[0.65rem] leading-tight text-muted-foreground">
            Sem série 24h
          </div>
        )}
      </div>
    </div>
  );
}

export function SymptomDot({ severity, label }: { severity: number | null; label: string }) {
  const color =
    severity == null || severity <= 0
      ? "#E5E7EB"
      : severity <= 2
        ? "#10B981"
        : severity <= 5
          ? "#FFA500"
          : "#FF4D4D";
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-[3px] text-[0.65rem] font-bold"
      style={{ borderColor: color, color }}
      title={label}
    >
      {label.slice(0, 1)}
    </span>
  );
}
