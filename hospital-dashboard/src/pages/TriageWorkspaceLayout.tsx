import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Outlet, useMatch } from "react-router-dom";
import { useOncoCare } from "@/context/OncoCareContext";
import { PendingStaffLinksPanel } from "@/components/oncocare/PendingStaffLinksPanel";
import { TriagePatientCard } from "@/components/oncocare/TriagePatientCard";
import { TriagePatientCardSkeleton } from "@/components/oncocare/TriagePatientCardSkeleton";
import { useBulkVitals } from "@/hooks/useBulkVitals";
import { clinicalTier } from "@/lib/clinicalTier";
import { staggerCard, staggerContainer } from "@/lib/motionPresets";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RiskRow } from "@/types/dashboard";

const GROUP_LABELS: Record<string, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  antes: "Anteriores",
  "sem-data": "Sem atualização recente",
};

function triageTimeBucket(row: RiskRow): string {
  const raw = row.lastSymptomAt;
  if (!raw) return "sem-data";
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return "sem-data";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday.getTime() + 86400000);
  if (t >= startToday && t < endToday) return "hoje";
  const weekAgo = now.getTime() - 7 * 86400000;
  if (t.getTime() >= weekAgo) return "semana";
  return "antes";
}

export type TriageWorkspaceOutletContext = { workspaceSplit: true };

/**
 * Arquitetura em 3 colunas (nav global | fila de triagem | detalhe):
 * colunas 2–3 seguem o padrão "lista + painel" (ex.: Dynamics / Sales Hub).
 */
export function TriageWorkspaceLayout() {
  const { busy, loadError, rows, staffProfile, pendingLinkRequests, hospitalsMeta } = useOncoCare();
  const hospitalNameById = useMemo(
    () => new Map(hospitalsMeta.map((h) => [h.id, h.display_name?.trim() || h.name])),
    [hospitalsMeta]
  );
  const [triageMode, setTriageMode] = useState<"all" | "critical">("all");

  const patientMatch = useMatch({ path: "/paciente/:patientId", end: false });
  const selectedPatientId = patientMatch?.params.patientId;

  const triageList = useMemo(() => {
    if (triageMode === "critical") {
      return rows.filter((r) => clinicalTier(r) === "critical");
    }
    return rows;
  }, [rows, triageMode]);

  const criticalCount = useMemo(() => rows.filter((r) => clinicalTier(r) === "critical").length, [rows]);

  const ids = useMemo(() => triageList.map((r) => r.id), [triageList]);
  const { vitalsByPatient } = useBulkVitals(ids);

  const groupedTriage = useMemo(() => {
    const order = ["hoje", "semana", "antes", "sem-data"] as const;
    const map = new Map<string, RiskRow[]>();
    for (const r of triageList) {
      const k = triageTimeBucket(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return order.filter((k) => (map.get(k)?.length ?? 0) > 0).map((key) => ({
      key,
      label: GROUP_LABELS[key],
      rows: map.get(key) ?? [],
    }));
  }, [triageList]);

  const welcome = staffProfile?.full_name?.split(/\s+/)[0] ?? "equipe";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-1 min-h-0 flex-col pb-4 lg:pb-6",
        selectedPatientId ? "gap-2 lg:gap-3" : "gap-5 lg:gap-6"
      )}
    >
      {selectedPatientId ? (
        <p className="sr-only">Triagem oncológica — fila à esquerda, prontuário à direita.</p>
      ) : null}

      {loadError ? (
        <p
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          {loadError}
        </p>
      ) : null}

      {!busy && pendingLinkRequests.length > 0 ? (
        <PendingStaffLinksPanel items={pendingLinkRequests} hospitalNameById={hospitalNameById} />
      ) : null}

      <div
        className={cn(
          "grid flex-1 min-h-0 gap-4 sm:gap-5 xl:items-stretch xl:gap-4 2xl:gap-5",
          selectedPatientId
            ? "grid-cols-1 max-xl:min-h-[min(88dvh,900px)] lg:min-h-[calc(100dvh-9rem)] xl:min-h-0 xl:h-[calc(100dvh-7.5rem)] xl:max-h-[calc(100dvh-7.5rem)] xl:grid-cols-[minmax(260px,min(36vw,420px))_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]"
            : "grid-cols-1"
        )}
      >
        <section
          className={cn(
            "flex min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-3xl bg-white/65 p-4 shadow-card ring-1 ring-slate-200/60 backdrop-blur-sm xl:h-full",
            !selectedPatientId && "hidden"
          )}
          aria-labelledby="triage-queue-heading"
        >
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-4">
            <h2 id="triage-queue-heading" className="text-lg font-black tracking-tight text-slate-900">
              Minha fila
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200",
                  triageMode === "all"
                    ? "border-lime-500 bg-lime-200 text-lime-900 shadow-card"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-lime-50"
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
                  "rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200",
                  triageMode === "critical"
                    ? "border-lime-500 bg-lime-200 text-lime-900 shadow-card"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-lime-50"
                )}
                onClick={() => setTriageMode("critical")}
              >
                Críticos ({criticalCount})
              </Button>
            </div>
          </div>

          <div
            id="triage-queue-cards"
            className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
            aria-label="Lista de pacientes na fila"
          >
            {busy ? (
              <div
                className={cn("flex min-h-[480px] flex-col gap-3")}
                aria-busy="true"
                aria-label="A carregar pacientes"
              >
                <span className="sr-only">A carregar pacientes…</span>
                {[0, 1, 2, 3, 4].map((i) => (
                  <TriagePatientCardSkeleton key={i} />
                ))}
              </div>
            ) : triageList.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-card">
                {pendingLinkRequests.length > 0
                  ? "Nenhum paciente aprovado neste filtro. Veja acima os pedidos pendentes — após o paciente aprovar no Aura, o nome aparece aqui."
                  : "Nenhum paciente neste filtro."}
              </p>
            ) : (
              groupedTriage.map((group) => (
                <div key={group.key}>
                  <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>
                  <motion.div
                    className="space-y-3"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    key={`${triageMode}-${group.key}-${group.rows.map((r) => r.id).join(",")}`}
                  >
                    {group.rows.map((r) => (
                      <motion.div key={r.id} variants={staggerCard}>
                        <TriagePatientCard
                          row={r}
                          vitals={vitalsByPatient[r.id] ?? []}
                          isSelected={selectedPatientId === r.id}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          className={cn(
            "relative flex min-h-[min(520px,70vh)] flex-col overflow-hidden rounded-3xl shadow-soft ring-1 ring-slate-200/60 backdrop-blur-sm xl:h-full xl:min-h-0 xl:max-h-full",
            selectedPatientId
              ? "border border-white/65 xl:border-l-4 xl:border-lime-400 xl:shadow-[inset_12px_0_24px_-12px_rgba(163,230,53,0.15)]"
                + " bg-gradient-to-br from-[rgba(251,252,247,0.72)] via-white/60 to-[rgba(248,240,240,0.60)]"
              : "border border-slate-100/80"
                + " bg-gradient-to-br from-[rgba(243,252,203,0.22)] via-[rgba(251,252,247,0.68)] to-[rgba(255,236,234,0.20)]"
          )}
          aria-label="Detalhe do paciente"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-transparent [scrollbar-gutter:stable]">
            <Outlet context={{ workspaceSplit: true } satisfies TriageWorkspaceOutletContext} />
          </div>
        </section>
      </div>
    </div>
  );
}
