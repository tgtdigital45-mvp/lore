"use client";

import { useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownAZ, ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { useOncoCare } from "@/context/OncoCareContext";
import { AddPatientModal } from "@/components/oncocare/AddPatientModal";
import { PendingStaffLinksPanel } from "@/components/oncocare/PendingStaffLinksPanel";
import { LinkAccessHistoryPanel } from "@/components/oncocare/LinkAccessHistoryPanel";
import { PatientFaceThumb } from "@/components/oncocare/PatientFaceThumb";
import { Badge } from "@/components/ui/badge";
import { clinicalTier, TIER_LABEL } from "@/lib/clinicalTier";
import { CANCER_PT } from "@/constants/dashboardLabels";
import {
  profileName,
  profileDob,
  profileAvatarUrl,
  ageFromDob,
  initialsFromName,
} from "@/lib/dashboardProfile";
import { formatPatientCodeDisplay } from "@/lib/patientCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { listContainerVariants, listItemVariants } from "@/lib/motionPresets";
import { cn } from "@/lib/utils";
import type { RiskRow } from "@/types/dashboard";

type PatientSortMode = "name-asc" | "name-desc" | "susp-asc" | "susp-desc";

function suspensionRingClass(score: number): string {
  if (score >= 50) return "border-clinical-critical text-clinical-critical";
  if (score >= 25) return "border-clinical-attention text-amber-900";
  return "border-clinical-success text-emerald-800";
}

function tierBarClass(tier: ReturnType<typeof clinicalTier>): string {
  if (tier === "critical") return "bg-rose-500";
  if (tier === "attention") return "bg-amber-400";
  return "bg-lime-500";
}

function tierBadgeClass(tier: ReturnType<typeof clinicalTier>): string {
  if (tier === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tier === "attention") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-lime-200 bg-lime-100 text-lime-900";
}

function SemaphoreIndicator({ row }: { row: RiskRow }) {
  const s = row.urgencySemaphore;
  if (!s) {
    return <span className="text-[0.65rem] font-medium text-muted-foreground">—</span>;
  }
  const cfg =
    s === "red"
      ? { dot: "bg-rose-500", label: "Vermelho" }
      : s === "yellow"
        ? { dot: "bg-amber-400", label: "Amarelo" }
        : { dot: "bg-lime-500", label: "Verde" };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 shrink-0 rounded-full", cfg.dot)} aria-hidden />
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{cfg.label}</span>
    </span>
  );
}

function PatientRow({ row }: { row: RiskRow }) {
  const tier = clinicalTier(row);
  const suspensionScore = row.suspensionRiskScore;
  const suspensionRing = suspensionRingClass(suspensionScore);
  const name = profileName(row.profiles);
  const age = ageFromDob(profileDob(row.profiles));
  const code = formatPatientCodeDisplay(row.patient_code) ?? `PR-${row.id.slice(0, 8).toUpperCase()}`;
  const faceUrl = profileAvatarUrl(row.profiles);
  const faceInitials = initialsFromName(name);
  const dossierPath = `/paciente/${row.id}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition hover:border-slate-200 hover:shadow-soft">
      <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-2xl", tierBarClass(tier))} aria-hidden />
      <Link
        href={dossierPath}
        className="flex min-h-[4.25rem] items-stretch gap-3 py-3 pl-4 pr-3 outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 sm:gap-4 sm:pl-5 sm:pr-4"
        aria-label={`Abrir dossiê de ${name}`}
      >
        <PatientFaceThumb
          url={faceUrl}
          initials={faceInitials}
          className="h-10 w-10 shrink-0 text-xs shadow-sm ring-2 ring-white sm:h-11 sm:w-11 sm:text-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-[0.9rem] font-bold tracking-tight text-slate-900 sm:text-[0.95rem]">{name}</span>
            <Badge variant="outline" className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase", tierBadgeClass(tier))}>
              {TIER_LABEL[tier]}
            </Badge>
            {row.current_stage ? (
              <Badge variant="outline" className="shrink-0 rounded-full border-teal-200 bg-teal-50 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-teal-800">
                {row.current_stage}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-slate-500">
            <span className="font-mono text-slate-700">{code}</span>
            <span className="text-slate-300">·</span>
            <span>{age ?? "—"}</span>
            <span className="text-slate-300">·</span>
            <span className="line-clamp-1 max-w-[min(100%,14rem)] text-slate-600">{CANCER_PT[row.primary_cancer_type] ?? row.primary_cancer_type}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">Semáforo</span>
              <SemaphoreIndicator row={row} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 flex-col items-center justify-center rounded-full border-2 bg-white text-center shadow-sm sm:size-10",
              suspensionRing
            )}
            title={`Risco de suspensão: ${suspensionScore}% (heurística)`}
          >
            <span className="text-[0.7rem] font-black tabular-nums sm:text-xs">{suspensionScore}</span>
          </div>
          <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" aria-hidden />
        </div>
      </Link>
    </div>
  );
}

function KpiChip({
  icon: Icon,
  value,
  label,
  variant = "neutral",
}: {
  icon?: ElementType;
  value: number;
  label: string;
  variant?: "neutral" | "rose" | "amber";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 shadow-sm",
        variant === "neutral" && "border-slate-200 bg-white",
        variant === "rose" && value > 0 && "border-rose-200 bg-rose-50",
        variant === "rose" && value === 0 && "border-slate-200 bg-white",
        variant === "amber" && value > 0 && "border-amber-200 bg-amber-50",
        variant === "amber" && value === 0 && "border-slate-200 bg-white"
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0 text-slate-400" /> : null}
      <div className="min-w-0">
        <p
          className={cn(
            "text-lg font-black tabular-nums leading-none sm:text-xl",
            variant === "rose" && value > 0 && "text-rose-700",
            variant === "amber" && value > 0 && "text-amber-800",
            (variant === "neutral" || value === 0) && "text-slate-900"
          )}
        >
          {value}
        </p>
        <p className="mt-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

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
    patientSearch,
    setPatientSearch,
    pendingLinkRequests,
  } = useOncoCare();
  const hospitalNameById = useMemo(
    () => new Map(hospitalsMeta.map((h) => [h.id, h.display_name?.trim() || h.name])),
    [hospitalsMeta]
  );
  const [triageMode, setTriageMode] = useState<"all" | "critical">("all");
  const [sortMode, setSortMode] = useState<PatientSortMode>("name-asc");
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

  const list = useMemo(() => {
    let base = searchFiltered;
    if (triageMode === "critical") {
      base = base.filter((r) => clinicalTier(r) === "critical");
    }
    return base;
  }, [searchFiltered, triageMode]);

  const sortedList = useMemo(() => {
    const arr = [...list];
    const nameKey = (r: RiskRow) => profileName(r.profiles).toLocaleLowerCase("pt-BR");
    switch (sortMode) {
      case "name-asc":
        return arr.sort((a, b) => nameKey(a).localeCompare(nameKey(b), "pt-BR"));
      case "name-desc":
        return arr.sort((a, b) => nameKey(b).localeCompare(nameKey(a), "pt-BR"));
      case "susp-asc":
        return arr.sort((a, b) => a.suspensionRiskScore - b.suspensionRiskScore);
      case "susp-desc":
        return arr.sort((a, b) => b.suspensionRiskScore - a.suspensionRiskScore);
      default:
        return arr;
    }
  }, [list, sortMode]);

  const criticalCount = useMemo(
    () => searchFiltered.filter((r) => clinicalTier(r) === "critical").length,
    [searchFiltered]
  );

  const alertCount = useMemo(
    () => searchFiltered.filter((r) => r.hasClinicalAlert).length,
    [searchFiltered]
  );

  const hospitalOptions = useMemo(
    () => hospitalsMeta.map((h) => ({ id: h.id, name: h.name })),
    [hospitalsMeta]
  );

  const staffHospitalIds = useMemo(() => hospitalsMeta.map((h) => h.id), [hospitalsMeta]);

  return (
    <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-col self-start pb-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Triagem</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Pacientes</h1>
              {!busy ? (
                <span className="rounded-full border border-slate-200 bg-surface-muted px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-700">
                  {searchFiltered.length}
                </span>
              ) : null}
            </div>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Lista em tempo real — alertas e risco de suspensão.</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {!busy ? (
              <div className="flex flex-wrap gap-2">
                <KpiChip icon={Users} value={searchFiltered.length} label="Total" variant="neutral" />
                <KpiChip value={criticalCount} label="Críticos" variant="rose" />
                <KpiChip
                  icon={alertCount > 0 ? AlertTriangle : undefined}
                  value={alertCount}
                  label="Com alerta"
                  variant="amber"
                />
              </div>
            ) : null}
            <Button
              type="button"
              onClick={() => setIsAddPatientOpen(true)}
              className="h-11 w-full rounded-xl bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 sm:w-auto"
            >
              <UserPlus className="mr-2 size-4" />
              Adicionar paciente
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filtrar por nome, prontuário ou diagnóstico…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-surface-muted pl-10 shadow-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
                aria-label="Filtrar pacientes"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-0.5 rounded-xl border border-slate-200 bg-surface-muted p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 rounded-lg px-3 text-sm font-semibold",
                    triageMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-muted-foreground"
                  )}
                  onClick={() => setTriageMode("all")}
                >
                  Todos
                  <span
                    className={cn(
                      "ml-2 rounded-md px-1.5 py-0.5 text-[0.65rem] font-black tabular-nums",
                      triageMode === "all" ? "bg-slate-900 text-white" : "bg-slate-200/80 text-slate-600"
                    )}
                  >
                    {searchFiltered.length}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 rounded-lg px-3 text-sm font-semibold",
                    triageMode === "critical" ? "bg-white text-rose-700 shadow-sm" : "text-muted-foreground"
                  )}
                  onClick={() => setTriageMode("critical")}
                >
                  Críticos
                  <span
                    className={cn(
                      "ml-2 rounded-md px-1.5 py-0.5 text-[0.65rem] font-black tabular-nums",
                      triageMode === "critical" ? "bg-rose-100 text-rose-800" : "bg-slate-200/80 text-slate-600"
                    )}
                  >
                    {criticalCount}
                  </span>
                </Button>
              </div>
              <Button
                type="button"
                variant={filterAlertOnly ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-9 rounded-xl font-semibold",
                  filterAlertOnly ? "bg-amber-600 hover:bg-amber-700" : "border-slate-200"
                )}
                onClick={() => setFilterAlertOnly((x) => !x)}
              >
                <AlertTriangle className="mr-1.5 size-4" />
                <span className="hidden sm:inline">Só com alerta</span>
                <span className="sm:hidden">Alerta</span>
              </Button>
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[12rem] sm:flex-initial">
                <ArrowDownAZ className="size-4 shrink-0 text-slate-400" aria-hidden />
                <label htmlFor="patient-sort" className="sr-only">
                  Ordenar lista de pacientes
                </label>
                <select
                  id="patient-sort"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as PatientSortMode)}
                  className="h-9 min-w-0 flex-1 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                >
                  <option value="name-asc">Nome A → Z</option>
                  <option value="name-desc">Nome Z → A</option>
                  <option value="susp-desc">Risco de suspensão (maior primeiro)</option>
                  <option value="susp-asc">Risco de suspensão (menor primeiro)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {!busy && pendingLinkRequests.length > 0 ? (
        <PendingStaffLinksPanel items={pendingLinkRequests} hospitalNameById={hospitalNameById} className="mt-4" />
      ) : null}

      {!busy && staffHospitalIds.length > 0 ? (
        <LinkAccessHistoryPanel hospitalIds={staffHospitalIds} hospitalNameById={hospitalNameById} className="mt-4" />
      ) : null}

      {loadError ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {loadError}
        </p>
      ) : null}

      <div
        id="patient-list"
        className="mt-6 flex min-h-[min(40vh,28rem)] flex-col gap-2"
        aria-busy={busy}
        aria-label={busy ? "Carregando pacientes" : "Lista de pacientes"}
      >
        {busy ? (
          <>
            <span className="sr-only">Carregando pacientes…</span>
            {[...Array(6)].map((_, i) => (
              <SkeletonPulse key={i} rounded="2xl" className="min-h-[5.75rem] w-full shrink-0" />
            ))}
          </>
        ) : (
          <>
            <motion.ul
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              className="flex list-none flex-col gap-2 p-0"
            >
              {sortedList.map((r) => (
                <motion.li key={r.id} variants={listItemVariants} className="min-w-0">
                  <PatientRow row={r} />
                </motion.li>
              ))}
            </motion.ul>

            {list.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-14 text-center shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted">
                  <Users className="size-6 text-slate-400" />
                </div>
                <div className="max-w-md">
                  <p className="text-base font-bold text-slate-800">Nenhum paciente encontrado</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {patientSearch
                      ? `Nenhum resultado para "${patientSearch}". Tente outra busca ou limpe os filtros.`
                      : "Ajuste os filtros ou adicione um novo paciente."}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl border-slate-200" onClick={() => setIsAddPatientOpen(true)}>
                  <UserPlus className="mr-2 size-4" />
                  Adicionar paciente
                </Button>
              </div>
            ) : null}
          </>
        )}
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
