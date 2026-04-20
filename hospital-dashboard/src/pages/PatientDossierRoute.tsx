import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useOncoCare } from "@/context/OncoCareContext";
import { PatientDossierPage } from "./PatientDossierPage";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

/**
 * Só renderiza o dossiê se o id estiver na fila atual (vínculos aprovados). Caso contrário redireciona para `/paciente`.
 */
export function PatientDossierRoute() {
  const { patientId } = useParams<{ patientId: string }>();
  const { rows, busy, loadError } = useOncoCare();

  const allowed = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  if (loadError) {
    return null;
  }

  /** Só bloqueia com skeleton no carregamento inicial; refreshes da triagem não desmontam o dossié. */
  if (busy && rows.length === 0) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 p-4">
        <SkeletonPulse className="h-12 w-full max-w-md" />
        <SkeletonPulse className="h-[40vh] w-full" />
      </div>
    );
  }

  if (!patientId || !allowed.has(patientId)) {
    return <Navigate to="/paciente" replace />;
  }

  return <PatientDossierPage />;
}
