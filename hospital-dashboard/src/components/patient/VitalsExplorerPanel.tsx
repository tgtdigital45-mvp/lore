import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { VitalLogRow } from "@/types/dashboard";
import { VITAL_TYPE_PT } from "@/constants/dashboardLabels";
import { cn } from "@/lib/utils";
import { formatPtDateTime, formatPtShort } from "@/lib/dashboardFormat";

export type VitalExplorerKind = "temperature" | "heart_rate" | "blood_pressure" | "spo2" | "weight" | "glucose";

export type VitalTimeRange = "day" | "week" | "month" | "6m" | "year";

const KIND_ORDER: VitalExplorerKind[] = [
  "temperature",
  "heart_rate",
  "blood_pressure",
  "spo2",
  "weight",
  "glucose",
];

const RANGE_ORDER: { id: VitalTimeRange; label: string; title: string }[] = [
  { id: "day", label: "D", title: "Dia" },
  { id: "week", label: "S", title: "Semana" },
  { id: "month", label: "M", title: "Mês" },
  { id: "6m", label: "6M", title: "6 meses" },
  { id: "year", label: "A", title: "Ano" },
];

function rangeStartMs(range: VitalTimeRange): number {
  const now = Date.now();
  const d = (ms: number) => now - ms;
  switch (range) {
    case "day":
      return d(24 * 3600 * 1000);
    case "week":
      return d(7 * 24 * 3600 * 1000);
    case "month":
      return d(30 * 24 * 3600 * 1000);
    case "6m":
      return d(182 * 24 * 3600 * 1000);
    case "year":
      return d(365 * 24 * 3600 * 1000);
    default:
      return d(7 * 24 * 3600 * 1000);
  }
}

type BpRow = { tMs: number; systolic: number; diastolic: number | null; iso: string };
type ScalarRow = { tMs: number; value: number; iso: string };

function filterByRange(vitals: VitalLogRow[], startMs: number): VitalLogRow[] {
  return vitals.filter((v) => new Date(v.logged_at).getTime() >= startMs);
}

function buildBpRows(rows: VitalLogRow[]): BpRow[] {
  const out: BpRow[] = [];
  for (const v of rows) {
    if (v.vital_type !== "blood_pressure" || v.value_systolic == null) continue;
    out.push({
      tMs: new Date(v.logged_at).getTime(),
      systolic: v.value_systolic,
      diastolic: v.value_diastolic ?? null,
      iso: v.logged_at,
    });
  }
  return out.sort((a, b) => a.tMs - b.tMs);
}

function buildScalarRows(rows: VitalLogRow[], kind: Exclude<VitalExplorerKind, "blood_pressure">): ScalarRow[] {
  const out: ScalarRow[] = [];
  for (const v of rows) {
    if (v.vital_type !== kind) continue;
    const y = v.value_numeric;
    if (y == null || !Number.isFinite(y)) continue;
    out.push({
      tMs: new Date(v.logged_at).getTime(),
      value: y,
      iso: v.logged_at,
    });
  }
  return out.sort((a, b) => a.tMs - b.tMs);
}

function axisTickLabel(tMs: number, range: VitalTimeRange): string {
  const d = new Date(tMs);
  if (range === "day") {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return formatPtShort(d.toISOString());
}

function tooltipTimeLabel(iso: string | undefined, range: VitalTimeRange): string {
  if (!iso) return "";
  if (range === "day") return formatPtDateTime(iso);
  return formatPtShort(iso);
}

function chartCaption(kind: VitalExplorerKind, unit: string): string {
  switch (kind) {
    case "blood_pressure":
      return "Pressão arterial (mmHg); eixo Y de baixo para cima; eixo X = data/hora.";
    case "temperature":
      return `Temperatura (${unit}); eixo Y de baixo para cima; eixo X = data/hora.`;
    case "heart_rate":
      return "Frequência cardíaca (bpm); eixo Y de baixo para cima; eixo X = data/hora.";
    case "spo2":
      return "SpO₂ (%); eixo Y de baixo para cima; eixo X = data/hora.";
    case "weight":
      return "Peso (kg); eixo Y de baixo para cima; eixo X = data/hora.";
    case "glucose":
      return "Glicemia (mg/dL); eixo Y de baixo para cima; eixo X = data/hora.";
    default:
      return "Valores no eixo vertical; tempo no eixo horizontal.";
  }
}

const CHART_LINE = "#f97316";
const CHART_LINE_SECONDARY = "#ea580c";
const CHART_DOT = "#0a0a0a";
const CHART_LABEL = "#64748b";

function formatVitalDisplay(v: VitalLogRow): string {
  if (v.vital_type === "blood_pressure" && v.value_systolic != null) {
    return `${v.value_systolic}/${v.value_diastolic ?? "—"}`;
  }
  if (v.value_numeric != null && Number.isFinite(v.value_numeric)) return String(v.value_numeric);
  return "—";
}

function groupVitalsByType(vitals: VitalLogRow[]): Map<string, VitalLogRow[]> {
  const m = new Map<string, VitalLogRow[]>();
  for (const v of vitals) {
    const t = v.vital_type;
    if (!m.has(t)) m.set(t, []);
    m.get(t)!.push(v);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
  }
  return m;
}

function orderedVitalTypeKeys(grouped: Map<string, VitalLogRow[]>): string[] {
  const known = KIND_ORDER.filter((k) => (grouped.get(k)?.length ?? 0) > 0);
  const extra = [...grouped.keys()].filter((k) => !KIND_ORDER.includes(k as VitalExplorerKind));
  extra.sort();
  return [...known, ...extra];
}

type Props = {
  vitals: VitalLogRow[];
  className?: string;
};

export function VitalsExplorerPanel({ vitals, className }: Props) {
  const [kind, setKind] = useState<VitalExplorerKind>("temperature");
  const [range, setRange] = useState<VitalTimeRange>("week");

  const startMs = useMemo(() => rangeStartMs(range), [range]);
  const inRange = useMemo(() => filterByRange(vitals, startMs), [vitals, startMs]);

  const chartBp = useMemo(() => buildBpRows(inRange), [inRange]);

  const chartScalar = useMemo(() => {
    if (kind === "blood_pressure") return [];
    return buildScalarRows(inRange, kind);
  }, [inRange, kind]);

  const unit =
    kind === "temperature"
      ? "°C"
      : kind === "spo2"
        ? "%"
        : kind === "heart_rate"
          ? "bpm"
          : kind === "weight"
            ? "kg"
            : kind === "glucose"
              ? "mg/dL"
              : "";

  const hasData =
    kind === "blood_pressure" ? chartBp.length > 0 : chartScalar.length > 0;

  const chartScalarLabeled = useMemo(() => {
    return chartScalar.map((r) => {
      let labelText: string;
      if (kind === "temperature" || kind === "weight") {
        labelText = r.value.toLocaleString("pt-BR", {
          minimumFractionDigits: kind === "temperature" ? 1 : 1,
          maximumFractionDigits: 1,
        });
      } else {
        labelText = String(Math.round(r.value));
      }
      return { ...r, labelText };
    });
  }, [chartScalar, kind]);

  const chartBpLabeled = useMemo(
    () =>
      chartBp.map((r) => ({
        ...r,
        sysLabel: String(Math.round(r.systolic)),
        diaLabel: r.diastolic != null && Number.isFinite(r.diastolic) ? String(Math.round(r.diastolic)) : "",
      })),
    [chartBp]
  );

  const groupedAll = useMemo(() => groupVitalsByType(vitals), [vitals]);
  const typeKeysOrdered = useMemo(() => orderedVitalTypeKeys(groupedAll), [groupedAll]);

  const chartMargin = { top: 32, right: 10, left: 2, bottom: 6 };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm">
        <div className="flex rounded-xl bg-slate-200/55 p-1 gap-0.5">
          {RANGE_ORDER.map(({ id, label, title: rangeTitle }) => (
            <button
              key={id}
              type="button"
              title={rangeTitle}
              onClick={() => setRange(id)}
              className={cn(
                "flex-1 min-w-0 rounded-lg px-1.5 py-2 text-xs font-bold transition-all sm:px-2",
                range === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/55"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs leading-snug text-slate-500">{chartCaption(kind, unit)}</p>

        <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Sinal</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all",
                kind === k
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90"
                  : "bg-slate-100/90 text-slate-600 hover:bg-slate-100"
              )}
            >
              {VITAL_TYPE_PT[k] ?? k}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-[280px] w-full min-w-0 rounded-xl bg-white p-2 shadow-inner ring-1 ring-slate-100/90">
          {!hasData ? (
            <div className="flex h-[280px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Sem registos deste tipo no intervalo seleccionado.
            </div>
          ) : kind === "blood_pressure" ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartBpLabeled} margin={chartMargin}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="tMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => axisTickLabel(Number(v), range)}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  stroke="#94a3b8"
                />
                <YAxis
                  width={42}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  stroke="#94a3b8"
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    tooltipTimeLabel(payload?.[0]?.payload?.iso as string | undefined, range)
                  }
                  formatter={(value, name) => [
                    `${value ?? ""}`,
                    String(name) === "systolic" ? "Sistólica" : "Diastólica",
                  ]}
                  contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                />
                <Line
                  type="natural"
                  dataKey="systolic"
                  name="systolic"
                  stroke={CHART_LINE}
                  strokeWidth={3}
                  dot={{ fill: CHART_DOT, stroke: CHART_DOT, strokeWidth: 1, r: 4 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="sysLabel"
                    position="top"
                    offset={10}
                    fill={CHART_LABEL}
                    fontSize={11}
                    fontWeight={500}
                  />
                </Line>
                <Line
                  type="natural"
                  dataKey="diastolic"
                  name="diastolic"
                  stroke={CHART_LINE_SECONDARY}
                  strokeWidth={3}
                  dot={{ fill: CHART_DOT, stroke: CHART_DOT, strokeWidth: 1, r: 4 }}
                  connectNulls
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="diaLabel"
                    position="top"
                    offset={10}
                    fill={CHART_LABEL}
                    fontSize={11}
                    fontWeight={500}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartScalarLabeled} margin={chartMargin}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="tMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => axisTickLabel(Number(v), range)}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  stroke="#94a3b8"
                />
                <YAxis
                  width={42}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  stroke="#94a3b8"
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    tooltipTimeLabel(payload?.[0]?.payload?.iso as string | undefined, range)
                  }
                  formatter={(value) => [`${value ?? ""} ${unit}`.trim(), VITAL_TYPE_PT[kind] ?? kind]}
                  contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                />
                <Line
                  type="natural"
                  dataKey="value"
                  stroke={CHART_LINE}
                  strokeWidth={3}
                  dot={{ fill: CHART_DOT, stroke: CHART_DOT, strokeWidth: 1, r: 4 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="labelText"
                    position="top"
                    offset={10}
                    fill={CHART_LABEL}
                    fontSize={11}
                    fontWeight={500}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Histórico de lançamentos por categoria
        </h3>
        {vitals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem registos de sinais vitais.</p>
        ) : (
          <ScrollArea className="max-h-[min(520px,70vh)] pr-3">
            <div className="space-y-6 pb-2">
              {typeKeysOrdered.map((typeKey) => {
                const rows = groupedAll.get(typeKey) ?? [];
                if (rows.length === 0) return null;
                const label = VITAL_TYPE_PT[typeKey] ?? typeKey;
                return (
                  <div key={typeKey}>
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">{label}</h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/90 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Data e hora</th>
                            <th className="px-3 py-2">Valor</th>
                            <th className="px-3 py-2">Unidade</th>
                            <th className="hidden px-3 py-2 sm:table-cell">Notas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.id} className="border-b border-slate-50 last:border-0">
                              <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
                                {formatPtDateTime(row.logged_at)}
                              </td>
                              <td className="px-3 py-2 tabular-nums text-slate-900">{formatVitalDisplay(row)}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.unit ?? "—"}</td>
                              <td className="hidden max-w-[12rem] truncate px-3 py-2 text-muted-foreground sm:table-cell" title={row.notes ?? undefined}>
                                {row.notes?.trim() ? row.notes : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
