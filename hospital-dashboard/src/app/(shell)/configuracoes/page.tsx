"use client";

import dynamic from "next/dynamic";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

const HospitalSettingsPage = dynamic(
  () => import("@/views/HospitalSettingsPage").then((m) => m.HospitalSettingsPage),
  {
    loading: () => (
      <div className="p-6" role="status" aria-live="polite">
        <SkeletonPulse className="h-72 w-full max-w-3xl rounded-2xl" />
      </div>
    ),
  }
);

export default function ConfiguracoesPage() {
  return <HospitalSettingsPage />;
}
