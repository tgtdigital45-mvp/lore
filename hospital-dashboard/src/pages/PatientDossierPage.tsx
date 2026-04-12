import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Activity, ArrowLeft, Calendar, FileOutput, Stethoscope, Zap } from "lucide-react";
import { usePatientClinicalBundle } from "@/hooks/usePatientClinicalBundle";
import { usePatientExamesHandlers } from "@/hooks/usePatientExamesHandlers";
import { calculateSuspensionRisk } from "@/lib/suspensionRisk";
import { computeClinicalNadirSummary } from "@/lib/clinicalNadir";
import { CANCER_PT } from "@/constants/dashboardLabels";
import { profileName, profileDob, ageFromDob, initialsFromName } from "@/lib/dashboardProfile";
import { formatPatientCodeDisplay } from "@/lib/patientCode";
import { formatPtDateTime } from "@/lib/dashboardFormat";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TemperatureAreaChart } from "@/components/patient/TemperatureAreaChart";
import { ToxicityHeatmap } from "@/components/patient/ToxicityHeatmap";
import PatientExamesPanel from "@/components/patient/tabs/PatientExamesPanel";
import PatientDiarioPanel from "@/components/patient/tabs/PatientDiarioPanel";

type DossierTab = "resumo" | "exames" | "diario";

export function PatientDossierPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);

  const tabParam = searchParams.get("tab");
  const tab: DossierTab = tabParam === "exames" || tabParam === "diario" ? tabParam : "resumo";

  const setTab = (t: DossierTab) => {
    if (t === "resumo") setSearchParams({}, { replace: true });
    else setSearchParams({ tab: t }, { replace: true });
  };

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
    refreshExames,
  } = usePatientClinicalBundle(patientId);

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

  if (!patientId) {
    return <p className="p-8 text-muted-foreground">ID inválido.</p>;
  }

  if (loading && !riskRow) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        A carregar dossiê…
      </div>
    );
  }

  if (error || !riskRow) {
    return (
      <div className="p-8">
        <p className="text-[#B91C1C]" role="alert">
          {error ?? "Não foi possível carregar o paciente."}
        </p>
        <Link to="/pacientes" className="mt-4 inline-block text-sm font-semibold text-[#6366F1] underline">
          Voltar à lista
        </Link>
      </div>
    );
  }

  const suspension = calculateSuspensionRisk(riskRow, symptoms, vitals, wearables, triageRules.fever_celsius_min);
  const nadir = computeClinicalNadirSummary(cycles, infusions);
  const active = nadir.activeCycle;
  const planned = active?.planned_sessions ?? 6;
  const completed = active?.completed_sessions ?? 0;
  const cycleLabel = active ? `${completed} / ${planned}` : "—";

  const name = profileName(riskRow.profiles);
  const age = ageFromDob(profileDob(riskRow.profiles));
  const code = formatPatientCodeDisplay(riskRow.patient_code) ?? `PR-${riskRow.id.slice(0, 8).toUpperCase()}`;

  const alerts = symptoms
    .filter((s) => s.requires_action || s.severity === "severe" || s.severity === "life_threatening")
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/pacientes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para lista
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-2xl border-[#E2E8F0]">
            <FileOutput className="mr-2 size-4" />
            Gerar relatório
          </Button>
          <Button type="button" className="rounded-2xl bg-[#0A0A0A] font-semibold text-white hover:bg-[#1A1A1A]">
            Prescrever conduta
          </Button>
        </div>
      </div>

      <Card className="mb-4 rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar className="size-16 rounded-2xl border border-[#E8EAED]">
              <AvatarFallback className="rounded-2xl text-lg font-black">{initialsFromName(name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">{name}</h1>
                {riskRow.current_stage ? (
                  <Badge className="rounded-lg bg-[#EEF2FF] font-bold text-[#4F46E5]">{riskRow.current_stage}</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {age ?? "—"} · — · ID: {code}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <Stethoscope className="size-4 text-[#6366F1]" />
                {CANCER_PT[riskRow.primary_cancer_type] ?? riskRow.primary_cancer_type}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-8 rounded-2xl bg-[#F8FAFC] px-6 py-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">Ciclo atual</p>
              <p className="text-3xl font-black text-[#2563EB]">{cycleLabel}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">Próximo nadir</p>
              <p className="flex items-center gap-2 text-lg font-bold text-[#EF4444]">
                <Calendar className="size-4" />
                {nadir.estimatedNadirWindowLabel.split(" ")[0] ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="patient-modal__tabs mb-6" role="tablist" aria-label="Secções do prontuário">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "resumo"}
          className={`patient-modal__tab ${tab === "resumo" ? "is-active" : ""}`}
          onClick={() => setTab("resumo")}
        >
          Resumo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "exames"}
          className={`patient-modal__tab ${tab === "exames" ? "is-active" : ""}`}
          onClick={() => setTab("exames")}
        >
          Exames
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "diario"}
          className={`patient-modal__tab ${tab === "diario" ? "is-active" : ""}`}
          onClick={() => setTab("diario")}
        >
          Diário
        </button>
      </div>

      {tab === "resumo" ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Activity className="size-5 text-[#EF4444]" />
                  Monitoramento de sinais vitais
                </h2>
                <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#166534]">Tempo real</span>
              </div>
              <TemperatureAreaChart vitals={vitals} />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#FEF2F2] px-3 py-2 text-center">
                  <p className="text-[0.65rem] font-bold uppercase text-[#B91C1C]">Temp. máx</p>
                  <p className="text-xl font-black text-[#EF4444]">
                    {(() => {
                      const t = vitals.filter((v) => v.vital_type === "temperature" && v.value_numeric != null);
                      if (t.length === 0) return "—";
                      const mx = Math.max(...t.map((x) => x.value_numeric!));
                      return `${mx.toFixed(1)}°C`;
                    })()}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#ECFEFF] px-3 py-2 text-center">
                  <p className="text-[0.65rem] font-bold uppercase text-[#0E7490]">Média SpO₂</p>
                  <p className="text-xl font-black text-[#14B8A6]">
                    {(() => {
                      const s = vitals.filter((v) => v.vital_type === "spo2" && v.value_numeric != null);
                      if (s.length === 0) return "—";
                      const avg = s.reduce((a, x) => a + (x.value_numeric ?? 0), 0) / s.length;
                      return `${avg.toFixed(0)}%`;
                    })()}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#EFF6FF] px-3 py-2 text-center">
                  <p className="text-[0.65rem] font-bold uppercase text-[#1D4ED8]">VFC</p>
                  <p className="text-xl font-black text-[#3B82F6]">
                    {(() => {
                      const h = wearables.filter((w) => w.metric === "hrv_sdnn" && w.value_numeric != null);
                      if (h.length === 0) return "—";
                      return `${h[0].value_numeric}ms`;
                    })()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                Mapa de calor de toxicidade (pós-infusão)
              </h2>
              <ToxicityHeatmap symptoms={symptoms} days={28} />
            </Card>
          </div>

          <aside className="space-y-6 lg:col-span-2">
            <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Zap className="size-5 text-[#F59E0B]" />
                Risco de suspensão (IA)
              </h2>
              <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
                <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={suspension.score >= 50 ? "#EF4444" : "#F59E0B"}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(suspension.score / 100) * 326.72} 326.72`}
                  />
                </svg>
                <div className="relative text-center">
                  <p className="text-3xl font-black text-[#EF4444]">{suspension.score}%</p>
                  <p className="text-[0.65rem] font-bold uppercase text-muted-foreground">Probabilidade</p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                {suspension.reasons.length > 0 ? suspension.reasons.join(" · ") : "Sem fatores fortes na janela recente."}
              </p>
              <Button type="button" variant="outline" className="mt-4 w-full rounded-2xl">
                Ver fatores de risco
              </Button>
            </Card>

            <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Alertas ativos</h2>
              <ul className="space-y-2">
                {alerts.length === 0 ? (
                  <li className="rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm text-muted-foreground">Sem alertas ativos.</li>
                ) : (
                  alerts.map((a) => (
                    <li key={a.id} className="rounded-2xl bg-[#FEF2F2] px-3 py-2 text-sm">
                      <span className="font-semibold text-[#B91C1C]">
                        {a.symptom_category ?? "Sintoma"} · {a.severity ?? "—"}
                      </span>
                      <p className="text-[0.65rem] text-muted-foreground">{formatPtDateTime(a.logged_at)}</p>
                    </li>
                  ))
                )}
              </ul>
            </Card>

            <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Preabilitação & nutrição</h2>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>Adesão à dieta</span>
                    <span>85%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div className="h-full w-[85%] rounded-full bg-[#0A0A0A]" />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>Exercícios físicos</span>
                    <span>40%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div className="h-full w-[40%] rounded-full bg-[#0A0A0A]" />
                  </div>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      ) : null}

      {tab === "exames" ? (
        <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
          <PatientExamesPanel
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
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Acesso ao prontuário registrado para conformidade (auditoria).
          </p>
        </Card>
      ) : null}

      {tab === "diario" ? (
        <Card className="rounded-3xl border border-[#E8EAED] p-6 shadow-sm">
          <PatientDiarioPanel modalLoading={loading} modalSymptoms={symptoms} />
        </Card>
      ) : null}

      {loading ? <p className="mt-4 text-center text-sm text-muted-foreground">A atualizar dados…</p> : null}
    </div>
  );
}
