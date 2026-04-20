import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BarChart3, FlaskConical, Settings2, Watch, X } from "lucide-react";
import type { BiomarkerModalRow, VitalLogRow, WearableSampleRow } from "@/types/dashboard";
import { VITAL_TYPE_PT } from "@/constants/dashboardLabels";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { modalOverlayTransition, modalPanelTransition } from "@/lib/motionPresets";

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

type MetricTileProps = {
  d: MetricDef;
  vitalSeries: Map<string, VitalLogRow[]>;
  wearableSeries: Map<string, WearableSampleRow[]>;
  biomarkerSeries: Map<string, BiomarkerModalRow[]>;
};

function MetricTile({ d, vitalSeries, wearableSeries, biomarkerSeries }: MetricTileProps) {
  if (d.kind === "vital") {
    const t = d.id.replace("vital:", "");
    const series = vitalSeries.get(t) ?? [];
    const last = series[series.length - 1];
    const nums = series.map((x) => x.value_numeric).filter((n): n is number => n != null);
    const theme = THEME_VITAL;
    return (
      <div className={cn("rounded-2xl border p-4 ring-1", theme.card, theme.ring)}>
        <div className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", theme.dot)} aria-hidden />
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{d.label}</p>
        </div>
        <p className="mt-2 text-xl font-black tracking-tight text-slate-900">{last ? formatVital(last) : "—"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{last ? formatPtDateTime(last.logged_at) : "Sem registros"}</p>
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
      <div className={cn("rounded-2xl border p-4 ring-1", theme.card, theme.ring)}>
        <div className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", theme.dot)} aria-hidden />
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{d.label}</p>
        </div>
        <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
          {last?.value_numeric != null ? `${last.value_numeric}${last.unit ? ` ${last.unit}` : ""}` : "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{last ? formatPtDateTime(last.observed_start) : "Sem registros"}</p>
        <MetricMiniChart nums={nums} uid={d.id} theme={theme} />
      </div>
    );
  }
  const name = d.id.replace("biomarker:", "");
  const series = biomarkerSeries.get(name) ?? [];
  const last = series[series.length - 1];
  const nums = series.map((x) => x.value_numeric).filter((n): n is number => n != null);
  const theme = THEME_BIOMARKER;
  return (
    <div className={cn("rounded-2xl border p-4 ring-1", theme.card, theme.ring)}>
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", theme.dot)} aria-hidden />
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{d.label}</p>
      </div>
      <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
        {last ? (last.value_numeric != null ? `${last.value_numeric}${last.unit ? ` ${last.unit}` : ""}` : (last.value_text ?? "—")) : "—"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{last ? formatPtDateTime(last.logged_at) : "Sem registros"}</p>
      <MetricMiniChart nums={nums} uid={d.id} theme={theme} />
    </div>
  );
}

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
  const defsByCategory = useMemo(
    () => ({
      vital: defs.filter((d) => d.kind === "vital"),
      wearable: defs.filter((d) => d.kind === "wearable"),
      biomarker: defs.filter((d) => d.kind === "biomarker"),
    }),
    [defs]
  );
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (!configOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setConfigOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [configOpen]);

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

  const visibleByCategory = useMemo(
    () => ({
      vital: visibleDefs.filter((d) => d.kind === "vital"),
      wearable: visibleDefs.filter((d) => d.kind === "wearable"),
      biomarker: visibleDefs.filter((d) => d.kind === "biomarker"),
    }),
    [visibleDefs]
  );

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
      <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
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
      <Card className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <BarChart3 className="size-5 text-[#6366F1]" aria-hidden />
              Métricas
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista organizada por categoria (sinais vitais, wearables, biomarcadores). Use &quot;Configurar métricas&quot; para escolher o que mostrar.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-slate-200 bg-white shadow-sm hover:bg-slate-50"
            onClick={() => setConfigOpen(true)}
          >
            <Settings2 className="mr-2 size-4" />
            Configurar métricas
          </Button>
        </div>
        {visibleDefs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] px-4 py-6 text-center text-sm text-muted-foreground">
            Todas as métricas estão ocultas. Use &quot;Configurar métricas&quot; para mostrar pelo menos uma.
          </p>
        ) : (
          <div className="space-y-10">
            {visibleByCategory.vital.length > 0 ? (
              <section className="scroll-mt-4" aria-labelledby="metrics-cat-vitals">
                <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"
                      aria-hidden
                    >
                      <Activity className="size-[1.125rem]" />
                    </span>
                    <div>
                      <h3 id="metrics-cat-vitals" className="text-base font-bold text-slate-900">
                        Sinais vitais
                      </h3>
                      <p className="text-sm text-muted-foreground">Medições clínicas registadas (pressão, temperatura, frequência, etc.).</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-slate-400">
                    {visibleByCategory.vital.length}{" "}
                    {visibleByCategory.vital.length === 1 ? "métrica" : "métricas"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleByCategory.vital.map((d) => (
                    <MetricTile
                      key={d.id}
                      d={d}
                      vitalSeries={vitalSeries}
                      wearableSeries={wearableSeries}
                      biomarkerSeries={biomarkerSeries}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {visibleByCategory.wearable.length > 0 ? (
              <section className="scroll-mt-4" aria-labelledby="metrics-cat-wearables">
                <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100"
                      aria-hidden
                    >
                      <Watch className="size-[1.125rem]" />
                    </span>
                    <div>
                      <h3 id="metrics-cat-wearables" className="text-base font-bold text-slate-900">
                        Wearables e dispositivos
                      </h3>
                      <p className="text-sm text-muted-foreground">Dados sincronizados de pulseiras, relógios e sensores.</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-slate-400">
                    {visibleByCategory.wearable.length}{" "}
                    {visibleByCategory.wearable.length === 1 ? "métrica" : "métricas"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleByCategory.wearable.map((d) => (
                    <MetricTile
                      key={d.id}
                      d={d}
                      vitalSeries={vitalSeries}
                      wearableSeries={wearableSeries}
                      biomarkerSeries={biomarkerSeries}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {visibleByCategory.biomarker.length > 0 ? (
              <section className="scroll-mt-4" aria-labelledby="metrics-cat-biomarkers">
                <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100"
                      aria-hidden
                    >
                      <FlaskConical className="size-[1.125rem]" />
                    </span>
                    <div>
                      <h3 id="metrics-cat-biomarkers" className="text-base font-bold text-slate-900">
                        Biomarcadores e exames
                      </h3>
                      <p className="text-sm text-muted-foreground">Resultados laboratoriais e paraclínicos associados ao dossiê.</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-slate-400">
                    {visibleByCategory.biomarker.length}{" "}
                    {visibleByCategory.biomarker.length === 1 ? "métrica" : "métricas"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleByCategory.biomarker.map((d) => (
                    <MetricTile
                      key={d.id}
                      d={d}
                      vitalSeries={vitalSeries}
                      wearableSeries={wearableSeries}
                      biomarkerSeries={biomarkerSeries}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </Card>

      <AnimatePresence>
        {configOpen ? (
          <motion.div
            key="metrics-config-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="metrics-config-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={modalOverlayTransition}
            onClick={() => setConfigOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={modalPanelTransition}
              onClick={(e) => e.stopPropagation()}
            >
          <Card className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-4xl border border-slate-100 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
              As preferências ficam guardadas neste browser{staffId ? " para a sua conta." : "."} Agrupamos por categoria para facilitar.
            </p>
            <div className="space-y-6">
              {defsByCategory.vital.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-700">
                    <Activity className="size-3.5" aria-hidden />
                    Sinais vitais
                  </p>
                  <ul className="space-y-2">
                    {defsByCategory.vital.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#E8EAED] bg-rose-50/30 px-3 py-2"
                        >
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
                </div>
              ) : null}
              {defsByCategory.wearable.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-800">
                    <Watch className="size-3.5" aria-hidden />
                    Wearables e dispositivos
                  </p>
                  <ul className="space-y-2">
                    {defsByCategory.wearable.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#E8EAED] bg-teal-50/30 px-3 py-2"
                        >
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
                </div>
              ) : null}
              {defsByCategory.biomarker.length > 0 ? (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-800">
                    <FlaskConical className="size-3.5" aria-hidden />
                    Biomarcadores e exames
                  </p>
                  <ul className="space-y-2">
                    {defsByCategory.biomarker.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#E8EAED] bg-violet-50/30 px-3 py-2"
                        >
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
                </div>
              ) : null}
            </div>
            <Button type="button" className="mt-6 w-full rounded-2xl" onClick={() => setConfigOpen(false)}>
              Fechar
            </Button>
          </Card>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
