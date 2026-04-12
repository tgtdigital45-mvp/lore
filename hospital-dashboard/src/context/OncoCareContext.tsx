import { createContext, useContext, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTriageData } from "../hooks/useTriageData";
import { usePatientListFilters } from "../hooks/usePatientListFilters";

export type OncoCareContextValue = ReturnType<typeof useOncoCareModel>;

function useOncoCareModel(session: Session | null) {
  const triage = useTriageData(session);
  const filters = usePatientListFilters(triage.rows);
  return { ...triage, ...filters };
}

const OncoCareContext = createContext<OncoCareContextValue | null>(null);

export function OncoCareProvider({ session, children }: { session: Session | null; children: ReactNode }) {
  const value = useOncoCareModel(session);
  return <OncoCareContext.Provider value={value}>{children}</OncoCareContext.Provider>;
}

export function useOncoCare() {
  const ctx = useContext(OncoCareContext);
  if (!ctx) throw new Error("useOncoCare must be used within OncoCareProvider");
  return ctx;
}
