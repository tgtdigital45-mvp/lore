"use client";

import dynamic from "next/dynamic";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

const EquipeClinicaPage = dynamic(
  () => import("@/views/EquipeClinicaPage").then((m) => m.EquipeClinicaPage),
  {
    loading: () => (
      <div className="p-6" role="status" aria-live="polite">
        <SkeletonPulse className="h-64 w-full max-w-5xl rounded-2xl" />
      </div>
    ),
  }
);

export default function EquipeClinicaRoutePage() {
  return <EquipeClinicaPage />;
}
