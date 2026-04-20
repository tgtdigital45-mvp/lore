import { Activity, Armchair, CalendarRange, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

type Kpis = { maintenance: number; occupied: number; available: number; total: number };

type Props = {
  kpis: Kpis;
  sessionsInHorizon: number;
  variant: "desk" | "display";
};

export function InfusionOpsKpiStrip({ kpis, sessionsInHorizon, variant }: Props) {
  const isDisplay = variant === "display";

  const cards = [
    {
      id: "occ",
      label: "Em sessão",
      value: kpis.occupied,
      sub: "postos com infusão ativa",
      icon: Activity,
      ring: "ring-sky-200/70",
      bar: "from-sky-500 to-sky-600",
      iconColor: "text-sky-600",
    },
    {
      id: "avail",
      label: "Disponíveis",
      value: kpis.available,
      sub: "livres neste momento",
      icon: Armchair,
      ring: "ring-emerald-200/80",
      bar: "from-emerald-500 to-teal-600",
      iconColor: "text-emerald-600",
    },
    {
      id: "maint",
      label: "Manutenção",
      value: kpis.maintenance,
      sub: "indisponíveis",
      icon: Wrench,
      ring: "ring-slate-200/90",
      bar: "from-slate-400 to-slate-600",
      iconColor: "text-slate-500",
    },
    {
      id: "sess",
      label: "Marcações (6h)",
      value: sessionsInHorizon,
      sub: "na janela operacional",
      icon: CalendarRange,
      ring: "ring-teal-200/80",
      bar: "from-teal-500 to-cyan-600",
      iconColor: "text-teal-600",
    },
  ] as const;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", isDisplay && "gap-4 md:gap-5")}>
      {cards.map((c) => (
        <div
          key={c.id}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90",
            c.ring,
            isDisplay && "p-5 md:p-6"
          )}
        >
          <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-95", c.bar)} />
          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">{c.label}</p>
              <p
                className={cn(
                  "mt-1 font-black tabular-nums tracking-tight text-slate-900",
                  isDisplay ? "text-3xl md:text-[2.35rem]" : "text-2xl"
                )}
              >
                {c.value}
              </p>
              <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{c.sub}</p>
            </div>
            <c.icon className={cn("size-7 shrink-0 opacity-90", c.iconColor, isDisplay && "size-8")} aria-hidden />
          </div>
        </div>
      ))}
    </div>
  );
}
