"use client";

import dynamic from "next/dynamic";

const PatientDossierRoute = dynamic(
  () => import("@/views/PatientDossierRoute").then((m) => m.PatientDossierRoute),
  {
    loading: () => (
      <div className="p-4 text-sm text-slate-500" role="status" aria-live="polite">
        Carregando dossiê…
      </div>
    ),
  }
);

export default function PatientDossierByIdPage() {
  return <PatientDossierRoute />;
}
