"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useOncoCare } from "@/context/OncoCareContext";
import { PatientDossierPage } from "./PatientDossierPage";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Button } from "@/components/ui/button";

/**
 * Só renderiza o dossiê se o id estiver na fila atual (vínculos aprovados). Caso contrário redireciona para `/paciente`.
 */
export function PatientDossierRoute() {
  const params = useParams();
  const patientId =
    typeof params?.patientId === "string" ? params.patientId : Array.isArray(params?.patientId) ? params.patientId[0] : undefined;
  const router = useRouter();
  const { rows, busy, triageQuery, loadError, loadTriage } = useOncoCare();

  const effectiveRows = useMemo(
    () => (rows.length > 0 ? rows : (triageQuery.data?.rows ?? [])),
    [rows, triageQuery.data]
  );
  const allowed = useMemo(() => new Set(effectiveRows.map((r) => r.id)), [effectiveRows]);

  useEffect(() => {
    if (loadError) return;
    if (busy) return;
    if (patientId && !allowed.has(patientId)) {
      router.replace("/paciente");
    }
  }, [loadError, busy, patientId, allowed, router]);

  if (loadError) {
    return (
      <div role="alert" className="flex w-full max-w-xl flex-col gap-4 p-6">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="secondary" className="w-fit rounded-xl" onClick={() => void loadTriage()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (busy) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 p-4">
        <SkeletonPulse className="h-12 w-full max-w-md" />
        <SkeletonPulse className="h-[40vh] w-full" />
      </div>
    );
  }

  if (!patientId || !allowed.has(patientId)) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 p-4" role="status" aria-live="polite">
        <SkeletonPulse className="h-12 w-full max-w-md" />
        <SkeletonPulse className="h-[40vh] w-full" />
        <p className="text-sm text-muted-foreground">A preparar dossiê…</p>
      </div>
    );
  }

  return <PatientDossierPage />;
}
