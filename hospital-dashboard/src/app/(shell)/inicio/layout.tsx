"use client";

import dynamic from "next/dynamic";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

const TriageWorkspaceLayout = dynamic(
  () => import("@/views/TriageWorkspaceLayout").then((m) => m.TriageWorkspaceLayout),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8" role="status" aria-live="polite">
        <SkeletonPulse className="h-32 w-full max-w-md rounded-2xl" />
      </div>
    ),
  }
);

export default function InicioLayout({ children }: { children: React.ReactNode }) {
  return <TriageWorkspaceLayout>{children}</TriageWorkspaceLayout>;
}
