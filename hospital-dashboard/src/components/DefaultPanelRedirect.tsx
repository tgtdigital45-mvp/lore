"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOncoCare } from "@/context/OncoCareContext";
import { getPanelDefaultPath } from "@/lib/panelDefaultPath";
import { PageSkeleton } from "@/components/PageSkeleton";

export function DefaultPanelRedirect() {
  const { rows } = useOncoCare();
  const to = useMemo(() => getPanelDefaultPath(rows), [rows]);
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return <PageSkeleton />;
}
