"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Stethoscope,
  Zap,
  LayoutDashboard,
  GitCommitHorizontal,
  BarChart2,
  FileText,
  Syringe,
  Flame,
  CheckSquare,
  FlaskConical,
  Pill,
  BookOpen,
  Salad,
  Watch,
  HeartPulse,
} from "lucide-react";
import { toast } from "sonner";
import { DossierSkeleton } from "@/components/skeletons/DossierSkeleton";
import { usePatientClinicalBundle } from "@/hooks/usePatientClinicalBundle";
import { useHeuristicRules } from "@/hooks/useHeuristicRules";
import { useDossierExtended } from "@/hooks/useDossierExtended";
import { usePatientExamesHandlers } from "@/hooks/usePatientExamesHandlers";
import { calculateSuspensionRisk } from "@/lib/suspensionRisk";
import { computeClinicalNadirSummary, firstInfusionSessionAtInCycle } from "@/lib/clinicalNadir";
import { symptomCategoryLabel, symptomSeverityLabel } from "@/lib/patientModalHelpers";
import { profileName, profileDob, profileAvatarUrl, ageFromDob, initialsFromName } from "@/lib/dashboardProfile";
import { formatPatientCodeDisplay } from "@/lib/patientCode";
import { formatPtDateTime, formatPtShort } from "@/lib/dashboardFormat";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CtcaeMatrixRow } from "@/components/patient/CtcaeSwimmerPlot";
import { DossierBentoGrid } from "@/components/patient/DossierBentoGrid";
import { DossierPatientHeader } from "@/components/patient/DossierPatientHeader";
import { TreatmentJourneyBar } from "@/components/patient/TreatmentJourneyBar";
import { DossierReportModal } from "@/components/patient/DossierReportModal";
import { PrescriptionMedsConfirmModal } from "@/components/patient/PrescriptionMedsConfirmModal";
// Lazy-loaded panels — cada aba só carrega JS quando clicada (Sprint 1)
import {
  PanelErrorBoundary,
  LazyPatientExamesPanel as PatientExamesPanel,
  LazyPatientDiarioPanel as PatientDiarioPanel,
  LazyPatientNutricaoPanel as PatientNutricaoPanel,
  LazyPatientAtividadesPanel as PatientAtividadesPanel,
  LazyPatientAgendamentosPanel as PatientAgendamentosPanel,
  LazyPatientMedicamentosPanel as PatientMedicamentosPanel,
  LazyPatientFichaMedicaPanel as PatientFichaMedicaPanel,
  LazyPatientTratamentoPanel as PatientTratamentoPanel,
  LazyPatientMensagensDossierPanel as PatientMensagensDossierPanel,
  LazyPatientAlertRulesPanel as PatientAlertRulesPanel,
  LazyVitalsExplorerPanel as VitalsExplorerPanel,
  LazyToxicityHeatmap as ToxicityHeatmap,
  LazyCtcaeSwimmerPlot as CtcaeSwimmerPlot,
  LazyEditableMetricsPanel as EditableMetricsPanel,
  LazyPatientTimelinePanel as PatientTimelinePanel,
  LazyPatientNotesPanel as PatientNotesPanel,
  LazyPatientTasksPanel as PatientTasksPanel,
} from "@/components/patient/LazyDossierPanels";
import { SuspensionFactorsModal } from "@/components/patient/SuspensionFactorsModal";
import type { DossierReportPayload } from "@/lib/dossierReportHtml";
import { useDossierFeverSound } from "@/hooks/useDossierFeverSound";
import { useTriageWorkspaceContext } from "@/context/TriageWorkspaceContext";
import { rememberPatientVisit } from "@/lib/panelDefaultPath";
import { AnimatePresence, motion } from "framer-motion";
import { listContainerVariants, listItemVariants, tabPanelVariants } from "@/lib/motionPresets";
import { cn } from "@/lib/utils";
import { useOncoCare } from "@/context/OncoCareContext";
import { computeNutritionActivityAdherence } from "@/lib/dossierAdherence";
import { latestVital } from "@/lib/vitalsSpark";

type DossierTab =
  | "resumo"
  | "linha_tempo"
  | "metricas"
  | "ficha"
  | "tratamento"
  | "exames"
  | "medicamentos"
  | "diario"
  | "nutricao"
  | "atividades"
  | "agendamentos"
  | "mensagens"
  | "toxicidade"
  | "sinais_vitais"
  | "tarefas";

const ALL_TAB_DEFS: { id: DossierTab; label: string; icon: React.ElementType }[] = [
  { id: "resumo", label: "Resumo", icon: LayoutDashboard },
  { id: "linha_tempo", label: "Linha do tempo", icon: GitCommitHorizontal },
  { id: "metricas", label: "Métricas", icon: BarChart2 },
  { id: "ficha", label: "Ficha médica", icon: FileText },
  { id: "tratamento", label: "Tratamento", icon: Syringe },
  { id: "toxicidade", label: "Toxicidade", icon: Flame },
  { id: "sinais_vitais", label: "Sinais vitais", icon: HeartPulse },
  { id: "tarefas", label: "Tarefas", icon: CheckSquare },
  { id: "exames", label: "Exames", icon: FlaskConical },
  { id: "medicamentos", label: "Medicamentos", icon: Pill },
  { id: "diario", label: "Diário", icon: BookOpen },
  { id: "nutricao", label: "Nutrição", icon: Salad },
  { id: "atividades", label: "Atividade e wearables", icon: Watch },
  { id: "agendamentos", label: "Agendamentos", icon: Calendar },
];

function tabVisibleForCarePhase(tab: DossierTab, phase: string | null | undefined): boolean {
  const p = phase ?? "active_treatment";
  if (p === "follow_up") {
    const hide = new Set<DossierTab>(["tratamento", "toxicidade", "nutricao", "atividades", "tarefas"]);
    return !hide.has(tab);
  }
  return true;
}

export function PatientDossierPage() {
  const { staffProfile } = useOncoCare();
  const params = useParams();
  const patientId =
    typeof params?.patientId === "string" ? params.patientId : Array.isArray(params?.patientId) ? params.patientId[0] : undefined;
  const router = useRouter();
  const pathname = usePathname() || "";
  useEffect(() => {
    if (patientId) rememberPatientVisit(patientId);
  }, [patientId]);
  const workspaceCtx = useTriageWorkspaceContext();
  const inWorkspace = workspaceCtx?.workspaceSplit === true;
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [suspensionFactorsOpen, setSuspensionFactorsOpen] = useState(false);

  const tabParam = searchParams.get("tab");
  const validTabs = new Set<DossierTab>([...ALL_TAB_DEFS.map((x) => x.id), "mensagens"]);
  const tab: DossierTab =
    tabParam && validTabs.has(tabParam as DossierTab) ? (tabParam as DossierTab) : "resumo";

  const setTab = (t: DossierTab) => {
    if (t === "resumo") router.replace(pathname, { scroll: false });
    else {
      const p = new URLSearchParams();
      p.set("tab", t);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    }
  };

  const { rules: heuristicRules } = useHeuristicRules();

  const {
    loading,
    error,
    riskRow,
    triageRules,
    cycles,
    infusions,
    symptoms,
    vitals,
    wearables,
    biomarkers,
    medicalDocs,
    medicationLogs,
    medications,
    nutritionLogs,
    appointments,
    emergencyContacts,
    cycleReadiness,
    alertRules,
    refreshExames,
    refreshCore,
    refreshClinical,
    refreshParaclinical,
  } = usePatientClinicalBundle(patientId);

  const { feverSoundEnabled, setFeverSoundEnabled, hasFeverRules } = useDossierFeverSound(
    patientId,
    alertRules,
    triageRules,
    symptoms
  );

  const dossierExt = useDossierExtended(patientId, Boolean(patientId && riskRow));


  const examesHandlers = usePatientExamesHandlers(session, patientId, refreshExames);

  const auditedIds = useRef(new Set<string>());
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(await refreshSupabaseSessionIfStale(data.session));
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      void refreshSupabaseSessionIfStale(s).then(setSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSymptomDelete = async (id: string) => {
    try {
      // Sync delete vital if linked
      await supabase.from("vital_logs").delete().filter("metadata->>symptom_log_id", "eq", id);
      const { error } = await supabase.from("symptom_logs").delete().eq("id", id);
      if (error) {
        toast.error("Erro ao remover sintoma: " + error.message);
      } else {
        toast.success("Sintoma removido com sucesso.");
        void refreshClinical();
      }
    } catch (e) {
      toast.error("Erro inesperado ao remover sintoma.");
    }
  };

  const handleVitalDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("vital_logs").delete().eq("id", id);
      if (error) {
        toast.error("Erro ao remover sinal vital: " + error.message);
      } else {
        toast.success("Sinal vital removido.");
        void refreshClinical();
      }
    } catch (e) {
      toast.error("Erro inesperado ao remover sinal vital.");
    }
  };

  useEffect(() => {
    if (!patientId || !riskRow) return;
    if (auditedIds.current.has(patientId)) return;
    auditedIds.current.add(patientId);
    void supabase.rpc("record_audit", {
      p_target_patient_id: patientId,
      p_action: "VIEW_PATIENT",
      p_metadata: { source: "hospital_dashboard_dossier" },
    });
  }, [patientId, riskRow]);

  useEffect(() => {
    if (!riskRow) return;
    if (!tabVisibleForCarePhase(tab, riskRow.care_phase)) {
      router.replace(pathname, { scroll: false });
    }
  }, [riskRow, tab, router, pathname]);

  if (!patientId) {
    return <p className="p-8 text-muted-foreground">ID inválido.</p>;
  }

  if (loading && !riskRow) {
    return <DossierSkeleton />;
  }

  if (error || !riskRow) {
    return (
      <div className="p-8">
        <p className="text-destructive" role="alert" aria-live="assertive" aria-atomic="true">
          {error ?? "Não foi possível carregar o paciente."}
        </p>
        {inWorkspace ? null : (
          <Link href="/pacientes" className="mt-4 inline-block text-sm font-semibold text-clinical-indigo underline">
            Voltar à lista
          </Link>
        )}
      </div>
    );
  }

  const suspension = calculateSuspensionRisk(
    riskRow,
    symptoms,
    vitals,
    wearables,
    triageRules.fever_celsius_min,
    biomarkers,
    heuristicRules
  );
  const nadir = computeClinicalNadirSummary(cycles, infusions);
  const active = nadir.activeCycle;
  const planned = active?.planned_sessions ?? 6;
  const completed = active?.completed_sessions ?? 0;
  const cycleLabel = active ? `${completed} / ${planned}` : "—";

  const name = profileName(riskRow.profiles);
  const avatarUrl = profileAvatarUrl(riskRow.profiles);
  const age = ageFromDob(profileDob(riskRow.profiles));
  const code = formatPatientCodeDisplay(riskRow.patient_code) ?? `PR-${riskRow.id.slice(0, 8).toUpperCase()}`;

  const nutritionActivityAdherence = computeNutritionActivityAdherence(nutritionLogs, wearables, 14);

  const lastTempSnap = latestVital(vitals, "temperature");
  const lastHrSnap = latestVital(vitals, "heart_rate");
  const lastSpo2Snap = latestVital(vitals, "spo2");
  const lastWtSnap = latestVital(vitals, "weight");
  const lastBpRow = [...vitals]
    .filter((v) => v.vital_type === "blood_pressure" && v.value_systolic != null)
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0];
  const lastBpLabel =
    lastBpRow != null ? `${lastBpRow.value_systolic}/${lastBpRow.value_diastolic ?? "—"}` : null;

  const alertSymptoms = symptoms.filter(
    (s) => s.requires_action || s.severity === "severe" || s.severity === "life_threatening"
  );
  const alerts = alertSymptoms.slice(0, 4);
  const alertCount = alertSymptoms.length;

  const firstInfusionAt = firstInfusionSessionAtInCycle(active, infusions);
  const lastInfusionLabel = nadir.lastCompletedInfusionAt ? formatPtShort(nadir.lastCompletedInfusionAt) : "—";
  const firstInfusionLabel = firstInfusionAt ? formatPtShort(firstInfusionAt) : "—";

  const reportPayload: DossierReportPayload = {
    patientName: name,
    patientCode: code,
    ageLabel: age ?? "—",
    cancerKey: riskRow.primary_cancer_type,
    stage: riskRow.current_stage,
    isInNadir: riskRow.is_in_nadir,
    feverThresholdC: triageRules.fever_celsius_min,
    vitals,
    symptoms,
    suspensionScore: suspension.score,
    suspensionFactors: suspension.factors,
    alertSymptoms: alertSymptoms.slice(0, 50),
    medicalDocs,
    biomarkers,
    medications,
    medicationLogs,
    nutritionLogs,
  };

  const visibleTabDefs = ALL_TAB_DEFS.filter((x) => tabVisibleForCarePhase(x.id, riskRow.care_phase));



  return (
    <div
      className={cn(
        inWorkspace
          ? "flex min-h-full min-h-0 w-full min-w-0 flex-col px-1 pb-8 pt-3 sm:px-3 sm:pt-4 md:px-4"
          : "mx-auto max-w-7xl pb-12"
      )}
    >
      {!inWorkspace ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/pacientes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600/90 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="size-4" />
            Voltar para lista
          </Link>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="dossier-header-aurora border-b border-white/45 bg-white/35 backdrop-blur-md">
          <DossierPatientHeader
            riskRow={riskRow}
            name={name}
            avatarUrl={avatarUrl}
            initials={initialsFromName(name)}
            age={age}
            code={code}
            alertCount={alertCount}
            onOpenReport={() => setReportOpen(true)}
            className="border-0 bg-transparent"
            feverSound={hasFeverRules ? { enabled: feverSoundEnabled, onChange: setFeverSoundEnabled } : null}
          />
        </div>
        <div className="space-y-4 px-4 pb-4 pt-2 md:px-6">
          <TreatmentJourneyBar cycles={cycles} />
        </div>
          <motion.div
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid w-full grid-cols-2 gap-x-4 gap-y-3 rounded-3xl border border-white/55 bg-white/45 px-4 py-4 shadow-sm backdrop-blur-sm sm:grid-cols-3 lg:grid-cols-5"
          >
            <motion.div variants={listItemVariants}>
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">Ciclo atual</p>
              <p className="text-2xl font-black text-teal-700">{cycleLabel}</p>
            </motion.div>
            <motion.div variants={listItemVariants}>
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">1ª infusão (ciclo)</p>
              <p className="text-sm font-bold text-slate-800">{firstInfusionLabel}</p>
            </motion.div>
            <motion.div variants={listItemVariants}>
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">Última infusão</p>
              <p className="text-sm font-bold text-slate-800">{lastInfusionLabel}</p>
            </motion.div>
            <motion.div variants={listItemVariants}>
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">Próxima infusão (estim.)</p>
              <p className="text-sm font-bold text-teal-700">{nadir.predictedNextInfusionLabel}</p>
            </motion.div>
            <motion.div variants={listItemVariants} className="col-span-2 sm:col-span-1">
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">Janela de nadir (7–14 d)</p>
              <p className="flex items-start gap-2 text-sm font-bold leading-snug text-rose-600">
                <Calendar className="mt-0.5 size-4 shrink-0" />
                <span>{nadir.estimatedNadirWindowLabel}</span>
              </p>
            </motion.div>
          </motion.div>
        </div>

      {/* ── Tabs + Content: sidebar left (xl) / horizontal top (mobile) ── */}
      <section 
        className="relative flex flex-col xl:flex-row xl:gap-0 xl:overflow-hidden xl:rounded-3xl xl:border xl:border-white/65 xl:bg-white/40 xl:backdrop-blur-sm xl:shadow-sm"
        aria-label="Detalhe do paciente"
      >
        {/* ── Tab sidebar (vertical on xl, horizontal scroll on smaller) ── */}
        <div
          className="mx-3 mb-4 flex flex-wrap gap-2 rounded-[1.25rem] border border-white/55 bg-white/45 p-2 shadow-sm backdrop-blur-md md:mx-5 xl:mx-0 xl:mb-0 xl:w-52 xl:shrink-0 xl:flex-col xl:flex-nowrap xl:gap-1 xl:self-start xl:sticky xl:top-4 xl:rounded-none xl:border-0 xl:border-r xl:border-white/40 xl:bg-transparent xl:p-4 xl:shadow-none"
          role="tablist"
          aria-label="Seções do prontuário"
        >
          {visibleTabDefs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`dossier-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`dossier-panel-${id}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 xl:w-full xl:justify-start xl:rounded-xl xl:px-3 xl:py-2.5",
                tab === id
                  ? "bg-foreground text-background shadow-md"
                  : "text-slate-700 hover:bg-white/70 hover:text-slate-900"
              )}
              onClick={() => setTab(id)}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content panel ── */}
        <div className="min-w-0 flex-1 border-t border-white/35 px-3 pb-8 pt-4 md:px-5 xl:border-0 xl:border-t-0">
      <AnimatePresence mode="wait">
      {tab === "resumo" ? (
        <motion.div
          key="resumo"
          id="dossier-panel-resumo"
          role="tabpanel"
          aria-labelledby="dossier-tab-resumo"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="space-y-8"
        >
          <DossierBentoGrid
            patientId={patientId}
            emergencyContacts={emergencyContacts}
            cycleReadiness={cycleReadiness}
            nadir={{
              predictedNextInfusionLabel: nadir.predictedNextInfusionLabel,
              estimatedNadirWindowLabel: nadir.estimatedNadirWindowLabel,
              cycleLabel,
            }}
            medications={medications}
            alertRules={alertRules}
            symptomsTimeline={symptoms}
            suspensionRisk={riskRow?.suspensionRiskScore}
            onRefreshRules={refreshParaclinical}
            onOpenSuspensionModal={() => setSuspensionFactorsOpen(true)}
            onGoTratamento={() => setTab("tratamento")}
          />

          <PatientNotesPanel
            patientId={patientId}
            staffId={session?.user?.id}
            notes={dossierExt.notes}
            onRefresh={() => void dossierExt.reload()}
          />

          <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Activity className="size-5 text-clinical-critical" />
                  Monitoramento de sinais vitais
                </h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Tempo real</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                <span className="font-semibold text-slate-900">Últimos valores:</span> Temp.{" "}
                {lastTempSnap != null ? `${lastTempSnap.toFixed(1)} °C` : "—"} · FC{" "}
                {lastHrSnap != null ? `${Math.round(lastHrSnap)} bpm` : "—"} · SpO₂{" "}
                {lastSpo2Snap != null ? `${Math.round(lastSpo2Snap)} %` : "—"} · PA{" "}
                {lastBpLabel ?? "—"}
                {lastWtSnap != null ? ` · Peso ${lastWtSnap.toFixed(1)} kg` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" className="rounded-2xl" onClick={() => setTab("sinais_vitais")}>
                  Ver sinais vitais
                </Button>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-center text-sm text-slate-600">
                <span className="font-semibold text-slate-800">VFC (wearable, último): </span>
                {(() => {
                  const h = wearables.filter((w) => w.metric === "hrv_sdnn" && w.value_numeric != null);
                  if (h.length === 0) return "—";
                  return `${h[0].value_numeric} ms`;
                })()}
              </div>
            </Card>

            <Card className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold">Toxicidade (CTCAE)</h2>
                <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => setTab("toxicidade")}>
                  Ver toxicidade completa
                </Button>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Mapa de calor dos últimos 28 dias; a aba <strong>Toxicidade</strong> inclui também o gráfico swimmer / matriz de eventos.
              </p>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white/80 p-2">
                <ToxicityHeatmap symptoms={symptoms} days={28} />
              </div>
            </Card>

          </div>

          <aside className="space-y-6 lg:col-span-2">
            {cycleReadiness ? (
              <Card className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
                  <Stethoscope className="size-5 text-clinical-indigo" />
                  Próximo ciclo (heurística)
                </h2>
                <Badge
                  className={
                    cycleReadiness.readiness_status === "hold"
                      ? "mb-2 bg-red-100 text-red-900"
                      : cycleReadiness.readiness_status === "likely_ok"
                        ? "mb-2 bg-emerald-100 text-emerald-900"
                        : "mb-2 bg-amber-50 text-amber-950"
                  }
                >
                  {cycleReadiness.readiness_status === "hold"
                    ? "Aguardar / rever"
                    : cycleReadiness.readiness_status === "likely_ok"
                      ? "Provável apto"
                      : "Rever com equipe"}
                </Badge>
                {cycleReadiness.protocol_name ? (
                  <p className="text-xs text-muted-foreground">Protocolo: {cycleReadiness.protocol_name}</p>
                ) : null}
                {cycleReadiness.readiness_reasons?.length ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {cycleReadiness.readiness_reasons.join(" · ")}
                  </p>
                ) : null}
              </Card>
            ) : null}
            <Card className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Zap className="size-5 text-clinical-attention" />
                Risco de suspensão (IA)
              </h2>
              <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
                <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                  <circle className="stroke-muted" cx="60" cy="60" r="52" fill="none" strokeWidth="12" />
                  <circle
                    className={suspension.score >= 50 ? "stroke-clinical-critical" : "stroke-clinical-attention"}
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(suspension.score / 100) * 326.72} 326.72`}
                  />
                </svg>
                <div className="relative text-center">
                  <p className="text-3xl font-black text-clinical-critical">{suspension.score}%</p>
                  <p className="text-[0.65rem] font-bold uppercase text-muted-foreground">Probabilidade</p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                {suspension.reasons.length > 0 ? suspension.reasons.join(" · ") : "Sem fatores fortes na janela recente."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full rounded-full border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                onClick={() => setSuspensionFactorsOpen(true)}
              >
                Ver fatores de risco
              </Button>
            </Card>

            <Card className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Alertas ativos</h2>
              <ul className="space-y-2">
                {alerts.length === 0 ? (
                  <li className="rounded-2xl border border-white/40 bg-white/40 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
                    Sem alertas ativos.
                  </li>
                ) : (
                  alerts.map((a) => (
                    <li key={a.id} className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm">
                      <span className="font-semibold text-destructive">
                        {symptomCategoryLabel(a)} · {symptomSeverityLabel(a)}
                      </span>
                      <p className="text-[0.65rem] text-muted-foreground">{formatPtDateTime(a.logged_at)}</p>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card className="dossier-glass-card rounded-3xl border-0 p-5 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">Preabilitação & nutrição</h2>
              <p className="mb-4 text-[0.65rem] leading-relaxed text-muted-foreground">
                Estimativa nos últimos {nutritionActivityAdherence.totalDays} dias (detalhe nas abas{" "}
                <strong>Nutrição</strong> e <strong>Atividade e wearables</strong>): dias com registo de nutrição / dias com
                atividade (wearables).
              </p>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>Registo de nutrição (dias)</span>
                    <span>{nutritionActivityAdherence.dietPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground transition-[width]"
                      style={{ width: `${nutritionActivityAdherence.dietPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>Atividade física (dias)</span>
                    <span>{nutritionActivityAdherence.exercisePct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground transition-[width]"
                      style={{ width: `${nutritionActivityAdherence.exercisePct}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
        </motion.div>
      ) : null}

      {tab === "metricas" ? (
        <motion.div
          key="metricas"
          id="dossier-panel-metricas"
          role="tabpanel"
          aria-labelledby="dossier-tab-metricas"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <EditableMetricsPanel
            staffId={session?.user?.id}
            vitals={vitals}
            wearables={wearables}
            biomarkers={biomarkers}
          />
        </Card>
        </motion.div>
      ) : null}

      {tab === "tratamento" ? (
        <motion.div
          key="tratamento"
          id="dossier-panel-tratamento"
          role="tabpanel"
          aria-labelledby="dossier-tab-tratamento"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PatientTratamentoPanel
            loading={loading}
            cycles={cycles}
            infusions={infusions}
            medications={medications}
            onUpdated={() => {
              refreshClinical();
              void refreshParaclinical();
            }}
          />
        </Card>
        </motion.div>
      ) : null}

      {tab === "ficha" ? (
        <motion.div
          key="ficha"
          id="dossier-panel-ficha"
          role="tabpanel"
          aria-labelledby="dossier-tab-ficha"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="space-y-6"
        >
          <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
            <PatientFichaMedicaPanel
              loading={loading}
              riskRow={riskRow}
              emergencyContacts={emergencyContacts}
              onSaved={() => {
                refreshCore();
                refreshClinical();
              }}
            />
            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              Conteúdo da ficha médica preenchido pelo paciente na app Aura. Contatos de emergência sujeitos às permissões
              de leitura (LGPD).
            </p>
          </Card>
          <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Regras de alerta personalizadas</h2>
            <PatientAlertRulesPanel
              patientId={patientId}
              medications={medications}
              rules={alertRules}
              onRefresh={() => void refreshParaclinical()}
            />
          </Card>
        </motion.div>
      ) : null}

      {tab === "mensagens" ? (
        <motion.div
          key="mensagens"
          id="dossier-panel-mensagens"
          role="tabpanel"
          aria-labelledby="dossier-tab-mensagens"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PatientMensagensDossierPanel session={session} patientId={patientId} />
        </Card>
        </motion.div>
      ) : null}

      {tab === "exames" ? (
        <motion.div
          key="exames"
          id="dossier-panel-exames"
          role="tabpanel"
          aria-labelledby="dossier-tab-exames"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PanelErrorBoundary label="Exames e documentos">
          <PatientExamesPanel
            patientId={patientId}
            modalLoading={loading}
            modalMedicalDocs={medicalDocs}
            modalBiomarkers={biomarkers}
            expandedExamDocId={examesHandlers.expandedExamDocId}
            onExpandedExamDocId={examesHandlers.setExpandedExamDocId}
            backendUrl={examesHandlers.backendUrl}
            docOpenError={examesHandlers.docOpenError}
            staffUploadBusy={examesHandlers.staffUploadBusy}
            staffUploadMsg={examesHandlers.staffUploadMsg}
            onStaffUpload={(f) => void examesHandlers.staffUploadExam(f)}
            onOpenExam={(id, mode) => void examesHandlers.openStaffExamView(id, mode)}
          />
          </PanelErrorBoundary>
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Acesso ao prontuário registrado para conformidade (auditoria).
          </p>
        </Card>
        </motion.div>
      ) : null}

      {tab === "medicamentos" ? (
        <motion.div
          key="medicamentos"
          id="dossier-panel-medicamentos"
          role="tabpanel"
          aria-labelledby="dossier-tab-medicamentos"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PatientMedicamentosPanel loading={loading} medications={medications} medicationLogs={medicationLogs} />
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Dados registrados pelo paciente na app; requer vínculo aprovado para visualização completa.
          </p>
        </Card>
        </motion.div>
      ) : null}

      {tab === "diario" ? (
        <motion.div
          key="diario"
          id="dossier-panel-diario"
          role="tabpanel"
          aria-labelledby="dossier-tab-diario"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PatientDiarioPanel modalLoading={loading} modalSymptoms={symptoms} onDelete={handleSymptomDelete} />
        </Card>
        </motion.div>
      ) : null}

      {tab === "nutricao" ? (
        <motion.div
          key="nutricao"
          id="dossier-panel-nutricao"
          role="tabpanel"
          aria-labelledby="dossier-tab-nutricao"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PatientNutricaoPanel modalLoading={loading} nutritionLogs={nutritionLogs} />
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Dados registrados na app Aura e sincronizados com o mesmo paciente no Supabase.
          </p>
        </Card>
        </motion.div>
      ) : null}

      {tab === "atividades" ? (
        <motion.div
          key="atividades"
          id="dossier-panel-atividades"
          role="tabpanel"
          aria-labelledby="dossier-tab-atividades"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PatientAtividadesPanel modalLoading={loading} wearables={wearables} />
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Dados registrados na app Aura e sincronizados com o mesmo paciente no Supabase.
          </p>
        </Card>
        </motion.div>
      ) : null}

      {tab === "agendamentos" ? (
        <motion.div
          key="agendamentos"
          id="dossier-panel-agendamentos"
          role="tabpanel"
          aria-labelledby="dossier-tab-agendamentos"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <PatientAgendamentosPanel
            modalLoading={loading}
            appointments={appointments}
            onRefresh={() => void refreshClinical()}
          />
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Compromissos partilhados com o calendário na app Aura; check-in também pode ser feito pelo paciente no celular.
          </p>
        </Card>
        </motion.div>
      ) : null}

      {tab === "linha_tempo" ? (
        <motion.div
          key="linha_tempo"
          id="dossier-panel-linha_tempo"
          role="tabpanel"
          aria-labelledby="dossier-tab-linha_tempo"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          {dossierExt.error ? <p className="text-destructive">{dossierExt.error}</p> : null}
          <PatientTimelinePanel patientId={patientId} events={dossierExt.timeline} onRefresh={() => void dossierExt.reload()} />
        </Card>
        </motion.div>
      ) : null}

      {tab === "toxicidade" ? (
        <motion.div
          key="toxicidade"
          id="dossier-panel-toxicidade"
          role="tabpanel"
          aria-labelledby="dossier-tab-toxicidade"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="space-y-6"
        >
          <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Mapa de calor (28 dias)</h2>
            <PanelErrorBoundary label="Mapa de calor">
            <ToxicityHeatmap symptoms={symptoms} days={28} />
            </PanelErrorBoundary>
          </Card>
          <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
            <h2 className="mb-4 text-lg font-bold">Swimmer / matriz de eventos</h2>
            <PanelErrorBoundary label="Swimmer Plot">
            <CtcaeSwimmerPlot rows={(dossierExt.ctcaeMatrix as CtcaeMatrixRow[]) ?? []} />
            </PanelErrorBoundary>
          </Card>
        </motion.div>
      ) : null}

      {tab === "sinais_vitais" ? (
        <motion.div
          key="sinais_vitais"
          id="dossier-panel-sinais_vitais"
          role="tabpanel"
          aria-labelledby="dossier-tab-sinais_vitais"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <HeartPulse className="size-5 text-teal-700" />
            Sinais vitais
          </h2>
          <VitalsExplorerPanel vitals={vitals} onDelete={handleVitalDelete} />
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-center text-sm text-slate-600">
            <span className="font-semibold text-slate-800">VFC (wearable, último): </span>
            {(() => {
              const h = wearables.filter((w) => w.metric === "hrv_sdnn" && w.value_numeric != null);
              if (h.length === 0) return "—";
              return `${h[0].value_numeric} ms`;
            })()}
          </div>
        </Card>
        </motion.div>
      ) : null}

      {tab === "tarefas" ? (
        <motion.div
          key="tarefas"
          id="dossier-panel-tarefas"
          role="tabpanel"
          aria-labelledby="dossier-tab-tarefas"
          variants={tabPanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
        <Card className="dossier-glass-card rounded-3xl border-0 p-6 shadow-none transition-all duration-200 hover:shadow-lg">
          <h2 className="mb-4 text-lg font-bold">Tarefas clínicas</h2>
          <PatientTasksPanel tasks={dossierExt.tasks} onRefresh={() => void dossierExt.reload()} />
        </Card>
        </motion.div>
      ) : null}
      </AnimatePresence>
      </div>
      </section>


      {loading ? <p className="mt-4 text-center text-sm text-muted-foreground">Atualizando dados…</p> : null}

      <DossierReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        payload={reportPayload}
        audit={{ staffName: staffProfile?.full_name?.trim() || "—" }}
      />
      <SuspensionFactorsModal
        open={suspensionFactorsOpen}
        onOpenChange={setSuspensionFactorsOpen}
        score={suspension.score}
        factors={suspension.factors}
      />
      <PrescriptionMedsConfirmModal
        open={examesHandlers.pendingPrescriptionItems.length > 0}
        onOpenChange={(o) => {
          if (!o) examesHandlers.clearPrescriptionItems();
        }}
        items={examesHandlers.pendingPrescriptionItems}
        patientId={patientId || ""}
        backendUrl={examesHandlers.backendUrl}
        onConfirmed={() => {
          void refreshParaclinical();
          toast.success("Medicamentos registrados a partir da receita.");
        }}
      />
    </div>
  );
}

