"use client";

import dynamic from "next/dynamic";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

const OncoCarePatientsPage = dynamic(
  () => import("@/views/OncoCarePatientsPage").then((m) => m.OncoCarePatientsPage),
  {
    loading: () => (
      <div className="p-6" role="status" aria-live="polite">
        <SkeletonPulse className="h-64 w-full max-w-5xl rounded-2xl" />
      </div>
    ),
  }
);

export default function PacientesPage() {
  return <OncoCarePatientsPage />;
}
