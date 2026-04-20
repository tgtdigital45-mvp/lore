import { useMemo } from "react";
import type { VitalLogRow } from "../../types/dashboard";

type Series = { label: string; points: { t: number; y: number }[]; color: string; unit?: string };

function buildSeries(vitals: VitalLogRow[], type: string, color: string, label: string): Series | null {
  const pts = vitals
    .filter((v) => v.vital_type === type)
    .map((v) => ({ t: new Date(v.logged_at).getTime(), y: v.value_numeric ?? NaN }))
    .filter((p) => Number.isFinite(p.y))
    .sort((a, b) => a.t - b.t);
  if (pts.length === 0) return null;
  return { label, points: pts, color, unit: type === "temperature" ? "°C" : type === "spo2" ? "%" : undefined };
}

function buildBpSeries(vitals: VitalLogRow[]): Series | null {
  const pts = vitals
    .filter((v) => v.vital_type === "blood_pressure" && v.value_systolic != null)
    .map((v) => ({
      t: new Date(v.logged_at).getTime(),
      y: v.value_systolic ?? 0,
    }))
    .sort((a, b) => a.t - b.t);
  if (pts.length === 0) return null;
  return { label: "Pressão (sistólica)", points: pts, color: "var(--accent)", unit: "mmHg" };
}

function SvgSparkline({ series, width, height }: { series: Series; width: number; height: number }) {
  const layout = useMemo(() => {
    const xs = series.points.map((p) => p.t);
    const ys = series.points.map((p) => p.y);
    const minT = Math.min(...xs);
    const maxT = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 6;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const xScale = (t: number) => pad + ((t - minT) / (maxT - minT || 1)) * w;
    const yScale = (y: number) => {
      const span = maxY - minY || 1;
      return pad + h - ((y - minY) / span) * h;
    };
    let d = "";
    series.points.forEach((p, i) => {
      const x = xScale(p.t);
      const y = yScale(p.y);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    const circles = series.points.map((p, i) => ({ cx: xScale(p.t), cy: yScale(p.y), key: i }));
    return { d, circles, minT, maxT, minY, maxY };
  }, [series, width, height]);

  return (
    <svg className="vitals-trend__svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={series.label}>
      <title>
        {series.label}: {series.points.length} pontos
      </title>
      <path d={layout.d} fill="none" stroke={series.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {layout.circles.map((c) => (
        <circle className="vitals-trend__point" key={c.key} cx={c.cx} cy={c.cy} r={3} fill={series.color} />
      ))}
    </svg>
  );
}

type Props = {
  vitals: VitalLogRow[];
  /** Quando a temperatura é mostrada noutro gráfico (ex.: área grande). */
  hideTemperature?: boolean;
};

export function VitalsTrendCharts({ vitals, hideTemperature }: Props) {
  const seriesList = useMemo(() => {
    const list: Series[] = [];
    const t = buildSeries(vitals, "temperature", "var(--risk-critical)", "Temperatura");
    const hr = buildSeries(vitals, "heart_rate", "var(--risk-attention)", "Freq. cardíaca");
    const spo2 = buildSeries(vitals, "spo2", "var(--vital-oxygen)", "SpO₂");
    const bp = buildBpSeries(vitals);
    if (t && !hideTemperature) list.push(t);
    if (hr) list.push(hr);
    if (spo2) list.push(spo2);
    if (bp) list.push(bp);
    return list;
  }, [vitals, hideTemperature]);

  if (seriesList.length === 0) {
    return <p className="muted">Sem sinais vitais registrados pelo paciente neste período.</p>;
  }

  const w = 340;
  const h = 72;

  return (
    <div className="vitals-trend rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      {seriesList.map((s) => (
        <div key={s.label} className="vitals-trend__block">
          <h4>
            {s.label}
            {s.unit ? ` (${s.unit})` : ""}
          </h4>
          <div className="vitals-trend__svg-wrap">
            <SvgSparkline series={s} width={w} height={h} />
          </div>
        </div>
      ))}
    </div>
  );
}
