import { BellRing, CalendarClock, ChevronRight, Phone, User } from "lucide-react";
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";
import type {
  CycleReadinessRow,
  EmergencyContactEmbed,
  MedicationRow,
  PatientAlertRule,
  SymptomLogDetail,
} from "@/types/dashboard";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { symptomCategoryLabel, symptomSeverityLabel } from "@/lib/patientModalHelpers";
import { Button } from "@/components/ui/button";
import { PatientAlertRulesPanel } from "@/components/patient/PatientAlertRulesPanel";
import { cn } from "@/lib/utils";

export type DossierBentoNadir = {
  predictedNextInfusionLabel: string;
  estimatedNadirWindowLabel: string;
  cycleLabel: string;
};

/** Semântica invertida: risco alto = vermelho, baixo = verde. */
function suspensionRiskColor(score: number): string {
  if (score >= 70) return "#ef4444";
  if (score <= 30) return "#84cc16";
  return "#f59e0b";
}

export type DossierBentoGridProps = {
  patientId: string;
  emergencyContacts: EmergencyContactEmbed[];
  cycleReadiness: CycleReadinessRow | null;
  nadir: DossierBentoNadir;
  medications: MedicationRow[];
  alertRules: PatientAlertRule[];
  symptomsTimeline: SymptomLogDetail[];
  /** 0–100: risco de suspensão (quanto maior, pior). */
  suspensionRisk?: number;
  onRefreshRules: () => void;
  onOpenSuspensionModal: () => void;
  onGoTratamento: () => void;
  className?: string;
};

/**
 * Grade estilo bento para o separador Resumo — Contato, Próximas ações, Score, Timeline e regras.
 */
export function DossierBentoGrid({
  patientId,
  emergencyContacts,
  cycleReadiness,
  nadir,
  medications,
  alertRules,
  symptomsTimeline,
  suspensionRisk,
  onRefreshRules,
  onOpenSuspensionModal,
  onGoTratamento,
  className,
}: DossierBentoGridProps) {
  const primary = emergencyContacts[0];
  const rawRisk = suspensionRisk;
  const riskDefined = typeof rawRisk === "number" && Number.isFinite(rawRisk);
  const riskValue = riskDefined ? Math.max(0, Math.min(100, Math.round(rawRisk))) : 0;
  const chartData = [
    {
      name: "suspensao",
      value: riskDefined ? riskValue : 0,
      fill: riskDefined ? suspensionRiskColor(riskValue) : "#e2e8f0",
    },
  ];

  const timeline = [...symptomsTimeline]
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
    .slice(0, 5);

  return (
    <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-12", className)}>
      {/* Coluna esquerda: contato + timeline */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <div className="dossier-glass-card flex flex-col rounded-3xl border-0 p-5 shadow-none ring-0 transition-shadow duration-300 hover:shadow-lg">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Contato</h2>
          {primary ? (
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                <User className="size-4 text-teal-600" aria-hidden />
                {primary.full_name}
              </p>
              {primary.phone ? (
                <p className="flex items-center gap-2 text-slate-600">
                  <Phone className="size-4 shrink-0 text-slate-400" aria-hidden />
                  {primary.phone}
                </p>
              ) : null}
              {primary.relationship ? (
                <p className="text-xs text-slate-500">Relação: {primary.relationship}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sem contacto de emergência registado na ficha.</p>
          )}
          {emergencyContacts.length > 1 ? (
            <p className="mt-3 text-xs text-slate-400">+{emergencyContacts.length - 1} outro(s) na ficha médica</p>
          ) : null}
        </div>

        <div className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none ring-0 transition-shadow duration-300 hover:shadow-lg">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Linha do tempo</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-500">Sem registos recentes no diário.</p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((s) => (
                <li key={s.id} className="relative border-l-2 border-teal-200 pl-4">
                  <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-teal-500" aria-hidden />
                  <p className="text-xs font-semibold text-slate-800">
                    {symptomCategoryLabel(s)} · {symptomSeverityLabel(s)}
                  </p>
                  <p className="text-[0.65rem] text-slate-400">{formatPtDateTime(s.logged_at)}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[0.65rem] text-slate-400">
            Janela nadir (estim.): {nadir.estimatedNadirWindowLabel}
          </p>
        </div>
      </div>

      {/* Próximas ações — centro */}
      <div className="lg:col-span-4">
        <div className="dossier-glass-card flex min-h-[280px] flex-col rounded-3xl border-0 p-5 shadow-none ring-0 transition-shadow duration-300 hover:shadow-lg lg:min-h-[360px]">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Próximas ações</h2>
          <div className="flex flex-1 flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
                <div>
                  <p className="text-[0.65rem] font-bold uppercase text-slate-400">Próxima infusão (estim.)</p>
                  <p className="font-bold text-slate-900">{nadir.predictedNextInfusionLabel}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Ciclo atual: </span>
                {nadir.cycleLabel}
              </div>
              {cycleReadiness ? (
                <div className="rounded-2xl bg-teal-50/80 px-3 py-2 text-xs leading-relaxed text-teal-900">
                  <span className="font-bold">Próximo ciclo: </span>
                  {cycleReadiness.readiness_status === "hold"
                    ? "Rever com a equipa antes de agendar."
                    : cycleReadiness.readiness_status === "likely_ok"
                      ? "Provável apto para continuar."
                      : "Avaliar sintomas e exames."}
                  {cycleReadiness.protocol_name ? ` · ${cycleReadiness.protocol_name}` : ""}
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              className="h-11 w-full rounded-full bg-slate-900 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-black hover:shadow-lg"
              onClick={onGoTratamento}
            >
              Ver tratamento
              <ChevronRight className="ml-1 size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      {/* Risco de suspensão — RadialBar */}
      <div className="lg:col-span-3">
        <div className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none ring-0 transition-shadow duration-300 hover:shadow-lg">
          <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Risco de suspensão</h2>
          <p className="mb-2 text-[0.7rem] text-slate-500">Índice agregado (0 = baixo risco · 100 = alto)</p>
          <div className="relative mx-auto h-[160px] w-full min-w-0 max-w-[200px]">
            <ResponsiveContainer width="100%" height={160} minWidth={0}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="100%"
                barSize={14}
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: "#f1f5f9" }} dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
              <span
                className="text-3xl font-black tabular-nums"
                style={{ color: riskDefined ? suspensionRiskColor(riskValue) : "#94a3b8" }}
              >
                {riskDefined ? riskValue : "—"}
              </span>
              {riskDefined ? <span className="text-[0.65rem] font-bold uppercase text-slate-400">/ 100</span> : null}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full rounded-full border-slate-200 text-xs font-semibold transition-all duration-200"
            onClick={onOpenSuspensionModal}
          >
            Contexto de risco de suspensão
          </Button>
        </div>
      </div>

      {/* Regras — full width collapsible */}
      <div className="col-span-full lg:col-span-12">
        <details className="group dossier-glass-card rounded-3xl border-0 shadow-none ring-0 open:shadow-lg">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-3xl px-5 py-4 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <BellRing className="size-4 text-teal-600" aria-hidden />
              Regras de alerta personalizadas
            </span>
            <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
          </summary>
          <div className="border-t border-slate-100 px-2 pb-4 pt-2">
            <PatientAlertRulesPanel
              patientId={patientId}
              medications={medications}
              rules={alertRules}
              onRefresh={onRefreshRules}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
