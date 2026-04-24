"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Maximize2, Minimize2, Sparkles } from "lucide-react";
import { useInfusionAgenda, type InfusionBookingRow } from "@/hooks/useInfusionAgenda";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { buildOperationalFeed, infusionPatientName, resourceLabelById } from "@/lib/infusionOpsShared";
import { InfusionOpsKpiStrip } from "@/components/infusionOps/InfusionOpsKpiStrip";
import { InfusionOpsOperationalFeed } from "@/components/infusionOps/InfusionOpsOperationalFeed";
import { InfusionOpsResourceCard } from "@/components/infusionOps/InfusionOpsResourceCard";
import { toast } from "sonner";
import { InfusionDisplaySkeleton } from "@/components/skeletons/InfusionDisplaySkeleton";

const POLL_MS = 45_000;
const HORIZON_MS = 6 * 3600 * 1000;

function useClock(tickMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

function useFullscreenToggle() {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const onChange = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível alternar tela cheia.");
    }
  }, []);
  return { fs, toggle };
}

export function InfusionOpsDisplayPage() {
  const clock = useClock(1000);
  const { fs, toggle } = useFullscreenToggle();
  const { resources, bookings, loading, error, hospitalId, reload, kpis, dataUpdatedAt } = useInfusionAgenda({
    pollIntervalMs: POLL_MS,
  });
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
    return <InfusionDisplaySkeleton />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/90 px-4 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-25%,rgba(20,184,166,0.14),transparent)]" />

      <header className="relative mb-8 flex flex-col gap-6 border-b border-slate-200/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/90 bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-800 shadow-sm ring-1 ring-teal-100/70">
            <Sparkles className="size-4 text-teal-600" aria-hidden />
            Vista hospitalar · infusão
          </div>
          <h1 className="text-balance font-black tracking-tight text-slate-900 [font-size:clamp(1.85rem,4vw+0.5rem,3.5rem)]">
            Painel operacional — infusão
          </h1>
          <p className="max-w-2xl text-pretty leading-relaxed text-slate-600 [font-size:clamp(1rem,1.1vw,1.2rem)]">
            Postos, próximos pacientes, alertas e avisos. Atualização automática a cada {Math.round(POLL_MS / 1000)}s e em
            tempo real.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-4 sm:items-end">
          <time
            dateTime={clock.toISOString()}
            className="self-center text-center tabular-nums font-black tracking-tight text-slate-800 [font-size:clamp(2.25rem,5vw,4.25rem)] sm:self-end"
          >
            {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </time>
          <div className="flex flex-wrap justify-center gap-2 text-sm sm:justify-end">
            {dataUpdatedAt ? (
              <span className="rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 font-semibold text-slate-600 shadow-sm">
                Dados:{" "}
                {new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
            <Button type="button" variant="secondary" className="rounded-xl text-base font-semibold" onClick={() => void reload()}>
              Atualizar agora
            </Button>
            <Button type="button" variant="outline" className="rounded-xl border-slate-300 bg-white/95 text-base font-semibold" onClick={() => void toggle()}>
              {fs ? <Minimize2 className="size-5" aria-hidden /> : <Maximize2 className="size-5" aria-hidden />}
              {fs ? "Sair de tela cheia" : "Tela cheia"}
            </Button>
            <Button asChild variant="ghost" className="rounded-xl text-base font-semibold text-slate-600">
              <Link href="/operacao-infusao">Painel detalhado</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="relative mb-10 space-y-10">
        <InfusionOpsKpiStrip kpis={kpis} sessionsInHorizon={upcoming.length} variant="display" />

        <InfusionOpsOperationalFeed alerts={alerts} notices={notices} size="display" />

        <section aria-label="Postos de infusão">
          <h2 className="sr-only">Postos de infusão</h2>
          {error ? (
            <p className="rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-lg font-semibold text-destructive" role="alert">
              {error}
            </p>
          ) : resources.length === 0 ? (
            <div
              className="rounded-3xl border border-dashed border-slate-300/80 bg-white/60 px-6 py-16 text-center shadow-sm"
              role="status"
            >
              <p className="text-xl font-black text-slate-900">Nenhum posto na grelha</p>
              <p className="mx-auto mt-3 max-w-lg text-base text-slate-600">
                Configure cadeiras e macas na agenda para este hospital. Esta vista atualiza sozinha quando existirem postos.
              </p>
              <Button asChild className="mt-8 rounded-2xl text-base font-bold" variant="secondary">
                <Link href="/agenda">Configurar agenda</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {resources.map((c) => (
                <InfusionOpsResourceCard key={c.id} chair={c} bookings={bookings} nowMs={now} variant="display" />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="sessoes-heading">
          <h2 id="sessoes-heading" className="mb-4 text-2xl font-black text-slate-900 sm:text-3xl">
            Próximas sessões (6h)
          </h2>
          <Card className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_16px_48px_rgba(15,23,42,0.07)] ring-1 ring-slate-100/90 sm:p-8">
            {upcoming.length === 0 ? (
              <p className="py-8 text-center text-xl font-medium text-slate-500">Sem marcações nesta janela.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((b: InfusionBookingRow) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50/95 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <span className="block font-black text-slate-900 [font-size:clamp(1.05rem,1.4vw,1.35rem)]">
                        {infusionPatientName(b)}
                      </span>
                      <span className="mt-1 block text-sm font-bold uppercase tracking-wider text-teal-700">
                        {resourceLabelById(resources, b.resource_id)}
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-slate-600">
                      {formatPtDateTime(b.starts_at)} → {formatPtDateTime(b.ends_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
