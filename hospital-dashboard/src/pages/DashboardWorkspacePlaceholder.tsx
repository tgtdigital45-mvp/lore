import { useMemo } from "react";
import { LayoutDashboard, MousePointerClick, RefreshCw } from "lucide-react";
import { useOncoCare } from "@/context/OncoCareContext";
import { PendingStaffLinksPanel } from "@/components/oncocare/PendingStaffLinksPanel";
import { DashboardKpiStrip, type DashboardKpiModel } from "@/components/oncocare/DashboardKpiStrip";
import { clinicalTier } from "@/lib/clinicalTier";
import { Button } from "@/components/ui/button";

/** Painel à direita quando nenhum paciente está selecionado na rota `/paciente` — mostra KPIs ao vivo da fila. */
export function DashboardWorkspacePlaceholder() {
  const { rows, busy, loadError, loadTriage, kpiStats, pendingLinkRequests, hospitalsMeta } = useOncoCare();
  const hospitalNameById = useMemo(
    () => new Map(hospitalsMeta.map((h) => [h.id, h.display_name?.trim() || h.name])),
    [hospitalsMeta]
  );

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

      <DashboardKpiStrip kpi={kpi} loading={busy} />

      <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 rounded-2xl border border-slate-100 bg-white/90 p-8 text-center shadow-sm sm:p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
          <LayoutDashboard className="size-8 text-slate-500" strokeWidth={1.5} />
        </div>
        <div className="max-w-sm space-y-2">
          {!busy && rows.length === 0 ? (
            <>
              <p className="text-lg font-semibold tracking-tight text-slate-800">Nenhum paciente na fila (aprovados)</p>
              <p className="text-sm leading-relaxed text-slate-500">
                {pendingLinkRequests.length > 0
                  ? "Há pedidos de vínculo em cima à espera da aprovação do paciente no app. Depois de aprovados, o doente aparece aqui automaticamente."
                  : "Quando um doente solicitar vínculo com o hospital pelo código no app Aura e a equipa aprovar, o paciente aparece aqui e o dossié clínico ficará disponível neste painel."}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold tracking-tight text-slate-800">Área de detalhe</p>
              <p className="text-sm leading-relaxed text-slate-500">
                Selecione um paciente na lista ao lado e abra o dossiê para ver o prontuário, sinais vitais e tratamento neste painel.
              </p>
            </>
          )}
        </div>
        {!busy && rows.length > 0 ? (
          <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <MousePointerClick className="size-4 shrink-0" aria-hidden />
            Use &quot;Ver dossiê completo&quot; no cartão do paciente
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={busy}
          onClick={() => void loadTriage()}
        >
          <RefreshCw className="mr-2 size-4" />
          Atualizar dados
        </Button>
      </div>
    </div>
  );
}
