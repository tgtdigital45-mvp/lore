"use client";

import dynamic from "next/dynamic";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

const OncoCareAgendaPage = dynamic(
  () => import("@/views/OncoCareAgendaPage").then((m) => m.OncoCareAgendaPage),
  {
    loading: () => (
      <div className="p-6" role="status" aria-live="polite">
        <SkeletonPulse className="h-64 w-full max-w-5xl rounded-2xl" />
      </div>
    ),
  }
);

export default function AgendaPage() {
  return <OncoCareAgendaPage />;
}
