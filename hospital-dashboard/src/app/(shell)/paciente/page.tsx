"use client";

import dynamic from "next/dynamic";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

const DashboardWorkspacePlaceholder = dynamic(
  () => import("@/views/DashboardWorkspacePlaceholder").then((m) => m.DashboardWorkspacePlaceholder),
  {
    loading: () => (
      <div className="p-4" role="status" aria-live="polite">
        <SkeletonPulse className="h-48 w-full max-w-4xl rounded-2xl" />
      </div>
    ),
  }
);

export default function PacienteIndexPage() {
  return <DashboardWorkspacePlaceholder />;
}
