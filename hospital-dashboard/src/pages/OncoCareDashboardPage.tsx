import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useOncoCare } from "@/context/OncoCareContext";
import { DashboardKpiStrip, type DashboardKpiModel } from "@/components/oncocare/DashboardKpiStrip";
import { DashboardSidebar } from "@/components/oncocare/DashboardSidebar";
import { ClinicalTasksPanel } from "@/components/oncocare/ClinicalTasksPanel";
import { TriagePatientCard } from "@/components/oncocare/TriagePatientCard";
import { useBulkVitals } from "@/hooks/useBulkVitals";
import { useClinicalTasks } from "@/hooks/useClinicalTasks";
import { clinicalTier } from "@/lib/clinicalTier";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OncoCareDashboardPage() {
  const { busy, loadError, rows, staffProfile, loadTriage, cohortHospitalId, hospitalsMeta } = useOncoCare();
  const [triageMode, setTriageMode] = useState<"all" | "critical">("all");

  const triageList = useMemo(() => {
    if (triageMode === "critical") {
      return rows.filter((r) => clinicalTier(r) === "critical");
    }
    return rows;
  }, [rows, triageMode]);

  const criticalCount = useMemo(() => rows.filter((r) => clinicalTier(r) === "critical").length, [rows]);

  const kpi: DashboardKpiModel = useMemo(() => {
    const criticalAlerts = rows.filter((r) => r.risk >= 4 || r.hasClinicalAlert).length;
    const nadirMonitoring = rows.filter((r) => r.is_in_nadir).length;
    return {
      activePatients: rows.length,
      activeTrendLabel: rows.length > 0 ? "" : "",
      criticalAlerts,
      nadirMonitoring,
      adherencePct: null,
      adherenceTrendLabel: "",
    };
  }, [rows]);

  const ids = useMemo(() => triageList.map((r) => r.id), [triageList]);
  const { vitalsByPatient } = useBulkVitals(ids);

  const sidebarAlerts = useMemo(() => rows.filter((r) => r.hasClinicalAlert || r.risk >= 3).slice(0, 8), [rows]);

  const welcome = staffProfile?.full_name?.split(/\s+/)[0] ?? "equipe";

  const hospitalOptions = useMemo(
    () => hospitalsMeta.map((h) => ({ id: h.id, name: h.name })),
    [hospitalsMeta]
  );
  const defaultHospitalId = cohortHospitalId ?? hospitalOptions[0]?.id ?? null;
  const { tasks: clinicalTasks, loading: clinicalTasksLoading, load: loadClinicalTasks } = useClinicalTasks(defaultHospitalId);

  return (
    <div className="mx-auto max-w-[1600px] pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">OncoCare · {welcome}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Triagem oncológica e gestão de recursos — layout clínico em tempo real.
        </p>
      </motion.div>

      {loadError ? (
        <p className="mt-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="mt-8">
        <DashboardKpiStrip kpi={kpi} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-10 lg:items-start">
        <div className="min-w-0 space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-black tracking-tight">Triagem de pacientes</h2>
            <div className="flex flex-wrap gap-2 rounded-2xl bg-[#F1F5F9] p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-xl font-semibold",
                  triageMode === "all" ? "bg-white shadow-sm" : "text-muted-foreground"
                )}
                onClick={() => setTriageMode("all")}
              >
                Todos ({rows.length})
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-xl font-semibold",
                  triageMode === "critical" ? "bg-white text-[#B91C1C] shadow-sm" : "text-muted-foreground"
                )}
                onClick={() => setTriageMode("critical")}
              >
                Críticos ({criticalCount})
              </Button>
            </div>
          </div>

          {busy ? (
            <p className="text-sm text-muted-foreground">Carregando pacientes…</p>
          ) : triageList.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-[#E2E8F0] p-8 text-center text-muted-foreground">
              Nenhum paciente neste filtro.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {triageList.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.35), duration: 0.35 }}
                >
                  <TriagePatientCard row={r} vitals={vitalsByPatient[r.id] ?? []} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:col-span-3">
          <ClinicalTasksPanel tasks={clinicalTasks} loading={clinicalTasksLoading} onRefresh={loadClinicalTasks} />
          <DashboardSidebar alertRows={sidebarAlerts} busy={busy} />
        </aside>
      </div>
    </div>
  );
}
