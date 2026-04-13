import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { CANCER_PT } from "@/constants/dashboardLabels";
import { computeClinicalNadirSummary } from "@/lib/clinicalNadir";
import { clinicalTier, TIER_ACCENT } from "@/lib/clinicalTier";
import { latestVital, vitalPointsLast24h } from "@/lib/vitalsSpark";
import type { RiskRow, SymptomLogDetail, TreatmentCycleRow, TreatmentInfusionRow, VitalLogRow } from "@/types/dashboard";
import { profileName, profileDob, profileAvatarUrl, ageFromDob, initialsFromName } from "@/lib/dashboardProfile";
import { formatPatientCodeDisplay } from "@/lib/patientCode";
import { formatPtDateTime, formatPtShort, formatRelativeSince } from "@/lib/dashboardFormat";
import { symptomCategoryLabel, symptomSeverityShort } from "@/lib/patientModalHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VitalMicroSpark } from "./VitalMicroSpark";
import { PatientFaceThumb } from "./PatientFaceThumb";

function spo2Color(v: number | null): string {
  if (v == null) return "#14B8A6";
  if (v < 94) return "#F59E0B";
  return "#14B8A6";
}

type Props = {
  row: RiskRow;
  vitals: VitalLogRow[];
};

export function TriagePatientCard({ row, vitals }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [cycles, setCycles] = useState<TreatmentCycleRow[]>([]);
  const [infusions, setInfusions] = useState<TreatmentInfusionRow[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomLogDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const tier = clinicalTier(row);
  const accent = TIER_ACCENT[tier];
  const tempPts = vitalPointsLast24h(vitals, "temperature");
  const spoPts = vitalPointsLast24h(vitals, "spo2");
  const hrPts = vitalPointsLast24h(vitals, "heart_rate");
  const lastSpo2 = latestVital(vitals, "spo2");
  const lastTemp = latestVital(vitals, "temperature");

  const name = profileName(row.profiles);
  const age = ageFromDob(profileDob(row.profiles));
  const code = formatPatientCodeDisplay(row.patient_code) ?? `PR-${row.id.slice(0, 8).toUpperCase()}`;
  const faceUrl = profileAvatarUrl(row.profiles);
  const faceInitials = initialsFromName(name);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDetailLoading(true);
    const pid = row.id;
    void (async () => {
      const [cyc, inf, sym] = await Promise.all([
        supabase
          .from("treatment_cycles")
          .select("id, protocol_name, start_date, end_date, status, planned_sessions, completed_sessions, last_session_at, infusion_interval_days")
          .eq("patient_id", pid)
          .order("start_date", { ascending: false })
          .limit(12),
        supabase.from("treatment_infusions").select("id, cycle_id, patient_id, session_at, status").eq("patient_id", pid).order("session_at", { ascending: false }).limit(40),
        supabase
          .from("symptom_logs")
          .select(
            "id, symptom_category, severity, body_temperature, logged_at, notes, entry_kind, pain_level, nausea_level, fatigue_level, requires_action, mood, symptom_started_at, symptom_ended_at"
          )
          .eq("patient_id", pid)
          .order("logged_at", { ascending: false })
          .limit(40),
      ]);
      if (cancelled) return;
      setCycles(!cyc.error && cyc.data ? (cyc.data as TreatmentCycleRow[]) : []);
      setInfusions(!inf.error && inf.data ? (inf.data as TreatmentInfusionRow[]) : []);
      setSymptoms(!sym.error && sym.data ? (sym.data as SymptomLogDetail[]) : []);
      setDetailLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row.id]);

  const nadir = computeClinicalNadirSummary(cycles, infusions);
  const inter = symptoms.find((s) => s.requires_action) ?? symptoms[0];
  let interText = "Sem intercorrência registrada recentemente.";
  if (inter) {
    interText = `${symptomCategoryLabel(inter)} · ${symptomSeverityShort(inter)}`;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-[#E8EAED] bg-white shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md"
      )}
    >
      <div className="flex min-w-0">
        <div className="w-1.5 shrink-0 self-stretch" style={{ background: accent }} aria-hidden />

        <div className="min-w-0 flex-1 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <PatientFaceThumb url={faceUrl} initials={faceInitials} className="h-11 w-11 text-xs" />
                <h3 className="text-lg font-black tracking-tight">{name}</h3>
                {row.current_stage ? (
                  <Badge className="rounded-lg border-0 bg-[#EEF2FF] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#4F46E5]">
                    {row.current_stage}
                  </Badge>
                ) : null}
                {row.urgencySemaphore === "red" ? (
                  <Badge className="rounded-lg border-0 bg-red-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-red-800">
                    Semáforo vermelho
                  </Badge>
                ) : row.urgencySemaphore === "yellow" ? (
                  <Badge className="rounded-lg border-0 bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-amber-900">
                    Semáforo amarelo
                  </Badge>
                ) : row.urgencySemaphore === "green" ? (
                  <Badge className="rounded-lg border-0 bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-emerald-800">
                    Semáforo verde
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono text-foreground/80">{code}</span> · {age ?? "—"} · —
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{CANCER_PT[row.primary_cancer_type] ?? row.primary_cancer_type}</p>
              {row.lastSymptomAt ? (
                <p className="mt-1 text-[0.65rem] font-semibold uppercase text-muted-foreground">
                  Último sintoma: {formatRelativeSince(row.lastSymptomAt)} · {formatPtShort(row.lastSymptomAt)}
                </p>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-[1.4] flex-wrap gap-3 rounded-2xl border border-[#F1F5F9] bg-[#FAFBFC] p-3 md:gap-4">
              <VitalMicroSpark
                data={tempPts}
                color={lastTemp != null && lastTemp >= 38 ? "#EF4444" : "#0F172A"}
                unit="°C"
                label="Temp."
              />
              <VitalMicroSpark data={spoPts} color={spo2Color(lastSpo2)} unit="%" label="SpO₂" />
              <VitalMicroSpark data={hrPts} color="#6366F1" unit="bpm" label="FC" />
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[200px] lg:flex-col">
              <Button
                type="button"
                className="rounded-2xl bg-[#0A0A0A] font-bold text-white hover:bg-[#1A1A1A]"
                onClick={() => navigate(`/paciente/${row.id}`)}
              >
                Ver dossiê completo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-[#E2E8F0] font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/paciente/${row.id}?tab=diario`);
                }}
              >
                <FileText className="mr-2 size-4" />
                Sintomas CTCAE
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-2xl text-muted-foreground"
                onClick={() => setOpen((o) => !o)}
              >
                Detalhe
                <ChevronDown className={cn("ml-1 size-4 transition-transform", open && "rotate-180")} />
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid gap-3 border-t border-[#F1F5F9] pt-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#F1F5F9] bg-[#FFFBEB] p-4">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#B45309]">Última intercorrência</p>
                    {detailLoading ? (
                      <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
                    ) : (
                      <>
                        <p className="mt-2 text-sm font-semibold leading-snug text-foreground">{interText}</p>
                        <p className="mt-2 text-[0.65rem] font-semibold uppercase text-muted-foreground">
                          {inter ? formatPtDateTime(inter.logged_at) : "—"}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="rounded-2xl border border-[#F1F5F9] p-4">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">Cronograma clínico</p>
                    {detailLoading ? (
                      <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
                    ) : (
                      <>
                        <p className="mt-2 text-sm">
                          <span className="text-muted-foreground">Janela nadir (estim.): </span>
                          <span className="font-semibold text-[#EF4444]">{nadir.estimatedNadirWindowLabel}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Próxima infusão (estim.): <span className="font-medium text-foreground">{nadir.predictedNextInfusionLabel}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Última sessão: {nadir.lastCompletedInfusionAt ? formatPtShort(nadir.lastCompletedInfusionAt) : "—"}</p>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
