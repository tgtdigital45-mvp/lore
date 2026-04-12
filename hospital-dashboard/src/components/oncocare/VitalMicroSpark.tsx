import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

type Props = {
  data: { iso: string; v: number }[];
  color: string;
  unit?: string;
  label: string;
};

export function VitalMicroSpark({ data, color, unit, label }: Props) {
  const chartData = data.map((d, i) => ({ i, v: d.v }));
  const last = data.length > 0 ? data[data.length - 1].v : null;

  return (
    <div className="min-w-0 flex flex-1 flex-col gap-1">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        <span className="shrink-0 text-lg font-black tabular-nums leading-none" style={{ color }}>
          {last != null ? last.toFixed(last >= 10 ? 0 : 1) : "—"}
          {unit ? <span className="text-xs font-medium text-muted-foreground"> {unit}</span> : null}
        </span>
        <div className="h-10 min-w-[72px] flex-1 overflow-hidden">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <YAxis hide domain={["auto", "auto"]} />
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-[0.7rem] text-muted-foreground">Sem série 24h</div>
          )}
        </div>
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
