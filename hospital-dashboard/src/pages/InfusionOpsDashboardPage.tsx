import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Tv } from "lucide-react";
import { useInfusionAgenda, type InfusionBookingRow } from "@/hooks/useInfusionAgenda";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { buildOperationalFeed, infusionPatientName, resourceLabelById } from "@/lib/infusionOpsShared";
import { InfusionOpsKpiStrip } from "@/components/infusionOps/InfusionOpsKpiStrip";
import { InfusionOpsOperationalFeed } from "@/components/infusionOps/InfusionOpsOperationalFeed";
import { InfusionOpsResourceCard } from "@/components/infusionOps/InfusionOpsResourceCard";

const HORIZON_MS = 6 * 3600 * 1000;

export function InfusionOpsDashboardPage() {
  const { resources, bookings, loading, error, hospitalId, kpis } = useInfusionAgenda();
  const now = Date.now();
  const horizon = now + HORIZON_MS;

  const upcoming = useMemo(() => {
    return bookings
      .filter((b) => {
        const s = new Date(b.starts_at).getTime();
        return s >= now && s <= horizon;
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [bookings, now, horizon]);

  const { alerts, notices } = useMemo(
    () => buildOperationalFeed(resources, bookings, now, HORIZON_MS, error),
    [resources, bookings, now, error]
  );

  if (loading && !hospitalId) {
    return (
      <div className="relative flex min-h-[50vh] flex-col items-center justify-center gap-4 overflow-hidden bg-slate-50 px-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(20,184,166,0.2),transparent)]" />
        <Loader2 className="relative size-10 animate-spin text-teal-600" aria-hidden />
        <p className="relative text-sm font-semibold text-slate-600">A carregar painel de infusão…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden pb-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_-30%,rgba(20,184,166,0.16),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-5 lg:px-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/90 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-teal-800 ring-1 ring-teal-100/60">
              <Sparkles className="size-3.5" aria-hidden />
              Operação hospitalar
            </div>
            <h1 className="text-balance text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Painel operacional — infusão
            </h1>
            <p className="text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              Visão premium do estado dos postos, alertas operacionais e marcações nas próximas 6 horas. Os dados
              atualizam em tempo real.
            </p>
          </div>
          <Button
            asChild
            className="h-12 shrink-0 gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 text-base font-bold text-white shadow-lg shadow-teal-900/15 ring-1 ring-white/20 hover:from-teal-500 hover:to-cyan-500"
          >
            <Link to="/tv/operacao-infusao" target="_blank" rel="noopener noreferrer">
              <Tv className="size-5" aria-hidden />
              Modo ecrã / TV
            </Link>
          </Button>
        </header>

        <InfusionOpsKpiStrip kpis={kpis} sessionsInHorizon={upcoming.length} variant="desk" />

        <InfusionOpsOperationalFeed alerts={alerts} notices={notices} size="desk" />

        <section aria-labelledby="postos-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="postos-heading" className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Postos de infusão
              </h2>
              <p className="mt-1 text-sm text-slate-600">Cada cartão mostra o estado, a sessão em curso e o próximo doente agendado.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resources.map((c) => (
              <InfusionOpsResourceCard key={c.id} chair={c} bookings={bookings} nowMs={now} variant="desk" />
            ))}
          </div>
        </section>

        <Card className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100/90 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 sm:text-xl">Próximas sessões (6h)</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{upcoming.length} na janela</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm font-medium text-slate-500">Sem marcações nesta janela.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b: InfusionBookingRow) => (
                <li
                  key={b.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50/95 to-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900">{infusionPatientName(b)}</span>
                    <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wider text-teal-700/90">
                      {resourceLabelById(resources, b.resource_id)}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-slate-600">
                    {formatPtDateTime(b.starts_at)} → {formatPtDateTime(b.ends_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
