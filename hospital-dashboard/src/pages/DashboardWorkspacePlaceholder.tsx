import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, MousePointerClick, RefreshCw, Syringe, Activity, Flame, ArrowRight } from "lucide-react";
import { useOncoCare } from "@/context/OncoCareContext";
import { PendingStaffLinksPanel } from "@/components/oncocare/PendingStaffLinksPanel";
import { DashboardKpiStrip, type DashboardKpiModel } from "@/components/oncocare/DashboardKpiStrip";
import { NadirAlertBanner } from "@/components/oncocare/NadirAlertBanner";
import { clinicalTier } from "@/lib/clinicalTier";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { supabase } from "@/lib/supabase";

/** Painel à direita quando nenhum paciente está selecionado na rota `/paciente` — centro de comando de riscos. */
export function DashboardWorkspacePlaceholder() {
  const { rows, busy, loadError, loadTriage, kpiStats, pendingLinkRequests, hospitalsMeta } = useOncoCare();
  const hospitalNameById = useMemo(
    () => new Map(hospitalsMeta.map((h) => [h.id, h.display_name?.trim() || h.name])),
    [hospitalsMeta]
  );

  const [activeCyclePatients, setActiveCyclePatients] = useState<number | null>(null);
  const [severeSymptoms24h, setSevereSymptoms24h] = useState<number | null>(null);

  const patientIds = useMemo(() => rows.map((r) => r.id), [rows]);

  useEffect(() => {
    if (patientIds.length === 0) {
      setActiveCyclePatients(0);
      setSevereSymptoms24h(0);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const d = new Date();
      d.setDate(d.getDate() - 21);
      const startIso = d.toISOString().slice(0, 10);
      const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

      const [cyclesRes, severeRes] = await Promise.all([
        supabase
          .from("treatment_cycles")
          .select("patient_id")
          .in("patient_id", patientIds)
          .eq("status", "active")
          .gte("start_date", startIso),
        supabase
          .from("symptom_logs")
          .select("id", { count: "exact", head: true })
          .in("patient_id", patientIds)
          .eq("severity", "severe")
          .gte("logged_at", since24),
      ]);

      if (cancelled) return;

      if (!cyclesRes.error && cyclesRes.data) {
        const distinct = new Set((cyclesRes.data as { patient_id: string }[]).map((x) => x.patient_id));
        setActiveCyclePatients(distinct.size);
      } else {
        setActiveCyclePatients(null);
      }

      if (!severeRes.error && typeof severeRes.count === "number") {
        setSevereSymptoms24h(severeRes.count);
      } else {
        setSevereSymptoms24h(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [patientIds]);

  const kpi: DashboardKpiModel = useMemo(() => {
    const criticalAlerts = rows.filter((r) => clinicalTier(r) === "critical").length;
    return {
      activePatients: kpiStats.total,
      activeTrendLabel: "Triagem em tempo real",
      criticalAlerts,
      nadirMonitoring: kpiStats.nadir,
      adherencePct: null,
      adherenceTrendLabel: "Sem agregação nesta versão",
    };
  }, [rows, kpiStats]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      {loadError ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {!busy && pendingLinkRequests.length > 0 ? (
        <PendingStaffLinksPanel items={pendingLinkRequests} hospitalNameById={hospitalNameById} />
      ) : null}

      <NadirAlertBanner rows={rows} />

      <DashboardKpiStrip kpi={kpi} loading={busy} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">Ciclo ativo (21 d)</p>
              {busy || activeCyclePatients === null ? (
                <div className="mt-1 space-y-2 pt-0.5" aria-hidden>
                  <SkeletonPulse rounded="xl" className="h-8 w-24" />
                  <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[14rem]" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{String(activeCyclePatients)}</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">Pacientes com ciclo iniciado nos últimos 21 dias</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-violet-100/80 p-2.5 text-violet-600">
              <Syringe className="size-5" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">Adesão à medicação</p>
              {busy ? (
                <div className="mt-1 space-y-2 pt-0.5" aria-hidden>
                  <SkeletonPulse rounded="xl" className="h-8 w-24" />
                  <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[14rem]" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-black tabular-nums text-slate-400 sm:text-3xl">—</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">Tomados vs agendados (em breve)</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-emerald-100/80 p-2.5 text-emerald-600">
              <Activity className="size-5" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-100 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">Sintomas severos (24h)</p>
              {busy || severeSymptoms24h === null ? (
                <div className="mt-1 space-y-2 pt-0.5" aria-hidden>
                  <SkeletonPulse rounded="xl" className="h-8 w-24" />
                  <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[14rem]" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-black tabular-nums text-rose-600 sm:text-3xl">{String(severeSymptoms24h)}</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">Registos com gravidade &quot;severe&quot; na janela</p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-rose-100/80 p-2.5 text-rose-600">
              <Flame className="size-5" strokeWidth={2} />
            </div>
          </div>
        </Card>

        <Link to="/operacao-infusao" className="group block">
          <Card className="h-full rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white/60 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-teal-400 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-teal-700/80">Agenda de infusão</p>
                {busy ? (
                  <div className="mt-2 space-y-2" aria-hidden>
                    <SkeletonPulse rounded="xl" className="h-5 w-40" />
                    <SkeletonPulse rounded="xl" className="h-4 w-full max-w-[12rem]" />
                    <SkeletonPulse rounded="xl" className="mt-3 h-4 w-28" />
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-bold text-slate-800">Operação e cadeiras</p>
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">Ver ocupação e recursos do dia</p>
                    <p className="mt-3 flex items-center gap-1 text-xs font-bold text-teal-700">
                      Abrir painel
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-2xl bg-teal-100/90 p-2.5 text-teal-700">
                <LayoutDashboard className="size-5" strokeWidth={2} />
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white/60 p-8 text-center shadow-sm backdrop-blur-sm sm:p-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <LayoutDashboard className="size-8 text-slate-500" strokeWidth={1.5} />
          </div>
          <div className="max-w-sm space-y-2">
            {!busy ? (
              <>
                <p className="text-lg font-semibold tracking-tight text-slate-800">Nenhum paciente na fila (aprovados)</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  {pendingLinkRequests.length > 0
                    ? "Há pedidos de vínculo em cima à espera da aprovação do paciente no app. Depois de aprovados, o doente aparece aqui automaticamente."
                    : "Quando um doente solicitar vínculo com o hospital pelo código no app Aura e a equipa aprovar, o paciente aparece aqui e o dossié clínico ficará disponível neste painel."}
                </p>
              </>
            ) : (
              <div className="space-y-2 pt-2" aria-hidden>
                <span className="sr-only">A carregar dados da triagem…</span>
                {[0, 1, 2].map((i) => (
                  <SkeletonPulse key={i} rounded="2xl" className="h-16 w-full" />
                ))}
              </div>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => void loadTriage()}>
            <RefreshCw className="mr-2 size-4" />
            Atualizar dados
          </Button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white/60 p-8 text-center shadow-sm backdrop-blur-sm sm:p-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <LayoutDashboard className="size-8 text-slate-500" strokeWidth={1.5} />
          </div>
          <div className="max-w-sm space-y-2">
            <p className="text-lg font-semibold tracking-tight text-slate-800">Área de detalhe</p>
            <p className="text-sm leading-relaxed text-slate-500">
              Selecione um paciente na lista ao lado e abra o dossiê para ver o prontuário, sinais vitais e tratamento neste painel.
            </p>
          </div>
          {!busy ? (
            <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <MousePointerClick className="size-4 shrink-0" aria-hidden />
              Use &quot;Ver dossiê completo&quot; no cartão do paciente
            </p>
          ) : null}
          <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => void loadTriage()}>
            <RefreshCw className="mr-2 size-4" />
            Atualizar dados
          </Button>
        </div>
      )}
    </div>
  );
}
