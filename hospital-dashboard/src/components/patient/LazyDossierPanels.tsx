"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { PanelErrorBoundary } from "@/components/PanelErrorBoundary";

// ---------------------------------------------------------------------------
// Loading fallback reutilizável para painéis dinâmicos
// ---------------------------------------------------------------------------
function PanelLoadingFallback({ label }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-100 bg-white/50 py-16 backdrop-blur-sm"
      role="status"
      aria-label={label ? `Carregando ${label}` : "Carregando painel"}
    >
      <Loader2 className="size-6 animate-spin text-slate-400" aria-hidden />
      {label ? <p className="text-xs font-medium text-muted-foreground">Carregando {label}…</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lazy imports — cada aba só carrega JS + dados quando o usuário clica nela
// ---------------------------------------------------------------------------

export const LazyPatientExamesPanel = dynamic(
  () => import("@/components/patient/tabs/PatientExamesPanel"),
  { loading: () => <PanelLoadingFallback label="Exames" />, ssr: false }
);

export const LazyPatientDiarioPanel = dynamic(
  () => import("@/components/patient/tabs/PatientDiarioPanel"),
  { loading: () => <PanelLoadingFallback label="Diário" />, ssr: false }
);

export const LazyPatientNutricaoPanel = dynamic(
  () => import("@/components/patient/tabs/PatientNutricaoPanel"),
  { loading: () => <PanelLoadingFallback label="Nutrição" />, ssr: false }
);

export const LazyPatientAtividadesPanel = dynamic(
  () => import("@/components/patient/tabs/PatientAtividadesPanel"),
  { loading: () => <PanelLoadingFallback label="Atividades" />, ssr: false }
);

export const LazyPatientAgendamentosPanel = dynamic(
  () => import("@/components/patient/tabs/PatientAgendamentosPanel"),
  { loading: () => <PanelLoadingFallback label="Agendamentos" />, ssr: false }
);

export const LazyPatientMedicamentosPanel = dynamic(
  () => import("@/components/patient/tabs/PatientMedicamentosPanel"),
  { loading: () => <PanelLoadingFallback label="Medicamentos" />, ssr: false }
);

export const LazyPatientFichaMedicaPanel = dynamic(
  () => import("@/components/patient/tabs/PatientFichaMedicaPanel"),
  { loading: () => <PanelLoadingFallback label="Ficha médica" />, ssr: false }
);

export const LazyPatientTratamentoPanel = dynamic(
  () => import("@/components/patient/tabs/PatientTratamentoPanel"),
  { loading: () => <PanelLoadingFallback label="Tratamento" />, ssr: false }
);

export const LazyPatientMensagensDossierPanel = dynamic(
  () =>
    import("@/components/patient/tabs/PatientMensagensDossierPanel").then((m) => ({
      default: m.PatientMensagensDossierPanel,
    })),
  { loading: () => <PanelLoadingFallback label="Mensagens" />, ssr: false }
);

export const LazyVitalsExplorerPanel = dynamic(
  () =>
    import("@/components/patient/VitalsExplorerPanel").then((m) => ({
      default: m.VitalsExplorerPanel,
    })),
  { loading: () => <PanelLoadingFallback label="Sinais vitais" />, ssr: false }
);

export const LazyToxicityHeatmap = dynamic(
  () =>
    import("@/components/patient/ToxicityHeatmap").then((m) => ({
      default: m.ToxicityHeatmap,
    })),
  { loading: () => <PanelLoadingFallback label="Toxicidade" />, ssr: false }
);

export const LazyCtcaeSwimmerPlot = dynamic(
  () =>
    import("@/components/patient/CtcaeSwimmerPlot").then((m) => ({
      default: m.CtcaeSwimmerPlot,
    })),
  { loading: () => <PanelLoadingFallback label="Swimmer Plot" />, ssr: false }
);

export const LazyEditableMetricsPanel = dynamic(
  () =>
    import("@/components/patient/EditableMetricsPanel").then((m) => ({
      default: m.EditableMetricsPanel,
    })),
  { loading: () => <PanelLoadingFallback label="Métricas" />, ssr: false }
);

export const LazyPatientTimelinePanel = dynamic(
  () =>
    import("@/components/patient/PatientTimelinePanel").then((m) => ({
      default: m.PatientTimelinePanel,
    })),
  { loading: () => <PanelLoadingFallback label="Linha do tempo" />, ssr: false }
);

export const LazyPatientNotesPanel = dynamic(
  () =>
    import("@/components/patient/PatientNotesPanel").then((m) => ({
      default: m.PatientNotesPanel,
    })),
  { loading: () => <PanelLoadingFallback label="Notas" />, ssr: false }
);

export const LazyPatientTasksPanel = dynamic(
  () =>
    import("@/components/patient/PatientTasksPanel").then((m) => ({
      default: m.PatientTasksPanel,
    })),
  { loading: () => <PanelLoadingFallback label="Tarefas" />, ssr: false }
);

export const LazyPatientAlertRulesPanel = dynamic(
  () =>
    import("@/components/patient/PatientAlertRulesPanel").then((m) => ({
      default: m.PatientAlertRulesPanel,
    })),
  { loading: () => <PanelLoadingFallback label="Regras de alerta" />, ssr: false }
);

// Re-export for convenience
export { PanelErrorBoundary };
export { PanelLoadingFallback };
