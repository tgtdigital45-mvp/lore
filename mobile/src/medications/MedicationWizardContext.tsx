import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createEmptyDraft, type MedicationDraft } from "@/src/medications/types";

type MedicationWizardContextValue = {
  draft: MedicationDraft;
  setDraft: (patch: Partial<MedicationDraft> | ((prev: MedicationDraft) => MedicationDraft)) => void;
  resetDraft: () => void;
};

const MedicationWizardContext = createContext<MedicationWizardContextValue | null>(null);

export function MedicationWizardProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<MedicationDraft>(() => createEmptyDraft());

  const setDraft = useCallback((patch: Partial<MedicationDraft> | ((prev: MedicationDraft) => MedicationDraft)) => {
    setDraftState((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraftState(createEmptyDraft());
  }, []);

  const value = useMemo(() => ({ draft, setDraft, resetDraft }), [draft, setDraft, resetDraft]);

  return <MedicationWizardContext.Provider value={value}>{children}</MedicationWizardContext.Provider>;
}

export function useMedicationWizard() {
  const ctx = useContext(MedicationWizardContext);
  if (!ctx) throw new Error("useMedicationWizard must be used within MedicationWizardProvider");
  return ctx;
}
