import { motion } from "framer-motion";
import { Activity, HeartPulse, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

export type DashboardKpiModel = {
  activePatients: number;
  activeTrendLabel: string;
  criticalAlerts: number;
  nadirMonitoring: number;
  adherencePct: number | null;
  adherenceTrendLabel: string;
};

type Props = {
  kpi: DashboardKpiModel;
};

export function DashboardKpiStrip({ kpi }: Props) {
  const cards = [
    {
      label: "Pacientes ativos",
      value: String(kpi.activePatients),
      sub: null as string | null,
      trend: kpi.activeTrendLabel,
      trendUp: true,
      icon: Users,
      valueClass: "text-foreground",
      iconWrapClass: "rounded-2xl bg-indigo-100/80 p-2 text-indigo-600 sm:p-2.5",
    },
    {
      label: "Alertas críticos",
      value: String(kpi.criticalAlerts).padStart(2, "0"),
      sub: "Ação necessária",
      trend: null,
      trendUp: null,
      icon: Activity,
      valueClass: "text-[#EF4444]",
      iconWrapClass: "rounded-2xl bg-rose-100/80 p-2 text-rose-600 sm:p-2.5",
    },
    {
      label: "Próximo nadir (24h)",
      value: String(kpi.nadirMonitoring).padStart(2, "0"),
      sub: "Monitorando",
      trend: null,
      trendUp: null,
      icon: HeartPulse,
      valueClass: "text-[#F59E0B]",
      iconWrapClass: "rounded-2xl bg-amber-100/80 p-2 text-amber-600 sm:p-2.5",
    },
    {
      label: "Adesão média",
      value: kpi.adherencePct != null ? `${kpi.adherencePct}%` : "—",
      sub: kpi.adherenceTrendLabel || null,
      trend: null,
      trendUp: true,
      icon: TrendingUp,
      valueClass: "text-[#22C55E]",
      iconWrapClass: "rounded-2xl bg-emerald-100/80 p-2 text-emerald-600 sm:p-2.5",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          className="h-full"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
        >
          <Card className="h-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">{c.label}</p>
                <p className={`text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl ${c.valueClass}`}>{c.value}</p>
                {c.sub ? <p className="mt-1 text-[0.7rem] font-medium text-muted-foreground sm:text-xs">{c.sub}</p> : null}
                {c.trend ? (
                  <p className={`mt-1 flex items-center gap-1 text-[0.7rem] font-semibold sm:text-xs ${c.trendUp ? "text-[#22C55E]" : "text-muted-foreground"}`}>
                    {c.trendUp ? <TrendingUp className="size-3.5" /> : null}
                    {c.trend}
                  </p>
                ) : null}
              </div>
              <div className={c.iconWrapClass}>
                <c.icon className="size-5 sm:size-6" strokeWidth={2} />
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
