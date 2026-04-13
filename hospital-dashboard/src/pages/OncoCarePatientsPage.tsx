import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { useOncoCare } from "@/context/OncoCareContext";
import { TriagePatientCard } from "@/components/oncocare/TriagePatientCard";
import { AddPatientModal } from "@/components/oncocare/AddPatientModal";
import { useBulkVitals } from "@/hooks/useBulkVitals";
import { clinicalTier } from "@/lib/clinicalTier";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OncoCarePatientsPage() {
  const {
    busy,
    loadError,
    searchFiltered,
    filterAlertOnly,
    setFilterAlertOnly,
    loadTriage,
    cohortHospitalId,
    hospitalsMeta,
  } = useOncoCare();
  const [triageMode, setTriageMode] = useState<"all" | "critical">("all");
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  const list = useMemo(() => {
    let base = searchFiltered;
    if (triageMode === "critical") {
      base = base.filter((r) => clinicalTier(r) === "critical");
    }
    return base;
  }, [searchFiltered, triageMode]);

  const criticalCount = useMemo(
    () => searchFiltered.filter((r) => clinicalTier(r) === "critical").length,
    [searchFiltered]
  );

  const ids = useMemo(() => list.map((r) => r.id), [list]);
  const { vitalsByPatient } = useBulkVitals(ids);

  const hospitalOptions = useMemo(
    () => hospitalsMeta.map((h) => ({ id: h.id, name: h.name })),
    [hospitalsMeta]
  );

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Pacientes</h1>
          <p className="mt-2 text-muted-foreground">Triagem com o mesmo cartão do painel principal.</p>
        </div>
        <Button
          type="button"
          onClick={() => setIsAddPatientOpen(true)}
          className="rounded-2xl bg-[#0A0A0A] font-bold text-white shadow-lg hover:bg-[#1A1A1A]"
        >
          <UserPlus className="mr-2 size-5" />
          Adicionar paciente
        </Button>
      </motion.div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 rounded-2xl bg-[#F1F5F9] p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("rounded-xl font-semibold", triageMode === "all" ? "bg-white shadow-sm" : "text-muted-foreground")}
            onClick={() => setTriageMode("all")}
          >
            Todos ({searchFiltered.length})
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
        <Button
          type="button"
          variant={filterAlertOnly ? "default" : "outline"}
          className="rounded-2xl"
          onClick={() => setFilterAlertOnly((x) => !x)}
        >
          Só com alerta clínico
        </Button>
      </div>

      {loadError ? (
        <p className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{loadError}</p>
      ) : null}

      {busy ? <p className="mt-4 text-sm text-muted-foreground">Carregando…</p> : null}

      <div className="mt-6 flex flex-col gap-4">
        {list.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
          >
            <TriagePatientCard row={r} vitals={vitalsByPatient[r.id] ?? []} />
          </motion.div>
        ))}
        {!busy && list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum paciente corresponde aos filtros.</p>
        ) : null}
      </div>

      <AddPatientModal
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
        loadTriage={loadTriage}
        hospitalId={cohortHospitalId}
        hospitalOptions={hospitalOptions}
      />
    </div>
  );
}
