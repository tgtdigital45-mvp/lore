import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Settings2, X } from "lucide-react";
import type { BiomarkerModalRow, VitalLogRow, WearableSampleRow } from "@/types/dashboard";
import { VITAL_TYPE_PT } from "@/constants/dashboardLabels";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type MetricKind = "vital" | "wearable" | "biomarker";

type MetricDef = {
  id: string;
  kind: MetricKind;
  label: string;
};

function storageKey(staffId: string | undefined) {
  return staffId ? `dossier_metrics_prefs_${staffId}` : "dossier_metrics_prefs_anon";
}

function formatVital(v: VitalLogRow): string {
  if (v.vital_type === "blood_pressure" && v.value_systolic != null && v.value_diastolic != null) {
    return `${v.value_systolic}/${v.value_diastolic} ${v.unit ?? "mmHg"}`;
  }
  if (v.value_numeric != null) {
    return `${v.value_numeric}${v.unit ? ` ${v.unit}` : ""}`;
  }
  return "—";
}

function buildDefs(
  vitals: VitalLogRow[],
  wearables: WearableSampleRow[],
  biomarkers: BiomarkerModalRow[]
): MetricDef[] {
  const vitalTypes = [...new Set(vitals.map((v) => v.vital_type))].sort();
  const wearableMetrics = [...new Set(wearables.map((w) => w.metric))].sort();
  const bioNames = [...new Set(biomarkers.map((b) => b.name))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const out: MetricDef[] = [];
  for (const t of vitalTypes) {
    out.push({
      id: `vital:${t}`,
      kind: "vital",
      label: VITAL_TYPE_PT[t] ?? t,
    });
  }
  for (const m of wearableMetrics) {
    out.push({ id: `wearable:${m}`, kind: "wearable", label: m.replace(/_/g, " ") });
  }
  for (const n of bioNames) {
    out.push({ id: `biomarker:${n}`, kind: "biomarker", label: n });
  }
  return out;
}

/** Caminho da linha + área fechada para SVG (mini gráfico). */
function buildAreaLinePaths(nums: number[], w = 168, h = 52): { line: string; area: string } | null {
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const padX = 4;
  const padY = 8;
  const iw = w - padX * 2;
  const ih = h - padY * 2;
  const pts = nums.map((v, i) => {
    const x = padX + (nums.length === 1 ? iw / 2 : (i / (nums.length - 1)) * iw);
    const y = padY + ih - ((v - min) / span) * ih;
    return { x, y };
  });
  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) line += ` L ${pts[i].x} ${pts[i].y}`;
  const bottom = h - padY;
  const area = `${line} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;
  return { line, area };
}

type ChartTheme = {
  stroke: string;
  stopA: string;
  stopB: string;
  ring: string;
  card: string;
  dot: string;
};

const THEME_VITAL: ChartTheme = {
  stroke: "#E11D48",
  stopA: "#FB7185",
  stopB: "#FFF1F2",
  ring: "ring-rose-200/70",
  card: "border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/40 shadow-sm shadow-rose-100/50",
  dot: "bg-rose-500",
};

const THEME_WEARABLE: ChartTheme = {
  stroke: "#0F766E",
  stopA: "#2DD4BF",
  stopB: "#ECFEFF",
  ring: "ring-teal-200/70",
  card: "border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/40 shadow-sm shadow-teal-100/50",
  dot: "bg-teal-500",
};

const THEME_BIOMARKER: ChartTheme = {
  stroke: "#7C3AED",
  stopA: "#A78BFA",
  stopB: "#FAF5FF",
  ring: "ring-violet-200/70",
  card: "border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/35 shadow-sm shadow-violet-100/50",
  dot: "bg-violet-500",
};

function MetricMiniChart({
  nums,
  uid,
  theme,
}: {
  nums: number[];
  uid: string;
  theme: ChartTheme;
}) {
  const paths = useMemo(() => buildAreaLinePaths(nums), [nums]);
  const gid = `grad-${uid.replace(/[^a-zA-Z0-9]/g, "-")}`;

  if (nums.length === 1) {
    return (
      <svg viewBox="0 0 168 52" className="mt-3 h-[52px] w-full" aria-hidden>
        <circle cx={84} cy={26} r={5} fill={theme.stroke} opacity={0.92} />
      </svg>
    );
  }

  if (!paths) return null;

  return (
    <svg viewBox="0 0 168 52" className="mt-3 h-[52px] w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.stopA} stopOpacity={0.55} />
          <stop offset="55%" stopColor={theme.stopA} stopOpacity={0.12} />
          <stop offset="100%" stopColor={theme.stopB} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={paths.area} fill={`url(#${gid})`} className="transition-opacity" />
      <path
        d={paths.line}
        fill="none"
        stroke={theme.stroke}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

type Props = {
  staffId: string | undefined;
  vitals: VitalLogRow[];
  wearables: WearableSampleRow[];
  biomarkers: BiomarkerModalRow[];
};

export function EditableMetricsPanel({ staffId, vitals, wearables, biomarkers }: Props) {
  const defs = useMemo(() => buildDefs(vitals, wearables, biomarkers), [vitals, wearables, biomarkers]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [configOpen, setConfigOpen] = useState(false);

  const key = storageKey(staffId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setPrefs(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [key]);

  const isEnabled = useCallback(
    (id: string) => {
      if (prefs[id] === undefined) return true;
      return prefs[id] !== false;
    },
    [prefs]
  );

  const setPref = (id: string, value: boolean) => {
    setPrefs((p) => {
      const next = { ...p, [id]: value };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const visibleDefs = defs.filter((d) => isEnabled(d.id));

  const vitalSeries = useMemo(() => {
    const map = new Map<string, VitalLogRow[]>();
    for (const v of vitals) {
      const arr = map.get(v.vital_type) ?? [];
      arr.push(v);
      map.set(v.vital_type, arr);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
    }
    return map;
  }, [vitals]);

  const wearableSeries = useMemo(() => {
    const map = new Map<string, WearableSampleRow[]>();
    for (const w of wearables) {
      const arr = map.get(w.metric) ?? [];
      arr.push(w);
      map.set(w.metric, arr);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.observed_start).getTime() - new Date(b.observed_start).getTime());
    }
    return map;
  }, [wearables]);

  const biomarkerSeries = useMemo(() => {
    const map = new Map<string, BiomarkerModalRow[]>();
    for (const b of biomarkers) {
      const arr = map.get(b.name) ?? [];
      arr.push(b);
      map.set(b.name, arr);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
    }
    return map;
  }, [biomarkers]);

  if (defs.length === 0) {
    return (
      <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">
          <BarChart3 className="size-5 text-[#6366F1]" aria-hidden />
          Métricas
        </h2>
        <p className="text-sm text-muted-foreground">Sem vitais, wearables ou biomarcadores para mostrar.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-3xl border border-[#E8EAED] bg-gradient-to-b from-slate-50/50 to-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="size-5 text-[#6366F1]" aria-hidden />
              Métricas (vitais, exames, wearables)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Últimos valores e tendência; personalize o que vê com o botão à direita.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-2xl border-[#C7D2FE] bg-white shadow-sm" onClick={() => setConfigOpen(true)}>
            <Settings2 className="mr-2 size-4" />
            Configurar métricas
          </Button>
        </div>
        {visibleDefs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-4 py-6 text-center text-sm text-muted-foreground">
            Todas as métricas estão ocultas. Use &quot;Configurar métricas&quot; para mostrar pelo menos uma.
          </p>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleDefs.map((d) => {
            if (d.kind === "vital") {
              const t = d.id.replace("vital:", "");
              const series = vitalSeries.get(t) ?? [];
              const last = series[series.length - 1];
              const nums = series.map((x) => x.value_numeric).filter((n): n is number => n != null);
              const theme = THEME_VITAL;
              return (
                <div key={d.id} className={cn("rounded-2xl border p-4 ring-1", theme.card, theme.ring)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", theme.dot)} aria-hidden />
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{d.label}</p>
                  </div>
                  <p className="mt-2 text-xl font-black tracking-tight text-slate-900">{last ? formatVital(last) : "—"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {last ? formatPtDateTime(last.logged_at) : "Sem registros"}
                  </p>
                  <MetricMiniChart nums={nums} uid={d.id} theme={theme} />
                </div>
              );
            }
            if (d.kind === "wearable") {
              const m = d.id.replace("wearable:", "");
              const series = wearableSeries.get(m) ?? [];
              const last = series[series.length - 1];
              const nums = series.map((x) => x.value_numeric).filter((n): n is number => n != null);
              const theme = THEME_WEARABLE;
              return (
                <div key={d.id} className={cn("rounded-2xl border p-4 ring-1", theme.card, theme.ring)}>
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", theme.dot)} aria-hidden />
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{d.label}</p>
                  </div>
                  <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                    {last?.value_numeric != null ? `${last.value_numeric}${last.unit ? ` ${last.unit}` : ""}` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {last ? formatPtDateTime(last.observed_start) : "Sem registros"}
                  </p>
                  <MetricMiniChart nums={nums} uid={d.id} theme={theme} />
                </div>
              );
            }
            const name = d.id.replace("biomarker:", "");
            const series = biomarkerSeries.get(name) ?? [];
            const last = series[series.length - 1];
            const nums = series
              .map((x) => x.value_numeric)
              .filter((n): n is number => n != null);
            const theme = THEME_BIOMARKER;
            return (
              <div key={d.id} className={cn("rounded-2xl border p-4 ring-1", theme.card, theme.ring)}>
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", theme.dot)} aria-hidden />
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{d.label}</p>
                </div>
                <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {last
                    ? last.value_numeric != null
                      ? `${last.value_numeric}${last.unit ? ` ${last.unit}` : ""}`
                      : (last.value_text ?? "—")
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {last ? formatPtDateTime(last.logged_at) : "Sem registros"}
                </p>
                <MetricMiniChart nums={nums} uid={d.id} theme={theme} />
              </div>
            );
          })}
        </div>
        )}
      </Card>

      {configOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="metrics-config-title"
        >
          <Card className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-xl">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-[#F1F5F9]"
              onClick={() => setConfigOpen(false)}
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
            <h3 id="metrics-config-title" className="mb-4 pr-8 text-lg font-bold">
              Métricas visíveis
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              As preferências ficam guardadas neste browser{staffId ? " para a sua conta." : "."}
            </p>
            <ul className="space-y-2">
              {defs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E8EAED] px-3 py-2">
                  <span className="text-sm font-medium">{d.label}</span>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isEnabled(d.id)}
                      onChange={(e) => setPref(d.id, e.target.checked)}
                      className="size-4 accent-[#6366F1]"
                    />
                    Mostrar
                  </label>
                </li>
              ))}
            </ul>
            <Button type="button" className="mt-6 w-full rounded-2xl" onClick={() => setConfigOpen(false)}>
              Fechar
            </Button>
          </Card>
        </div>
      ) : null}
    </>
  );
}
