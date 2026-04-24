"use client";

import { createContext, useContext, type ReactNode } from "react";

export type TriageWorkspaceSplitContext = { workspaceSplit: true };

const TriageWorkspaceContext = createContext<TriageWorkspaceSplitContext | null>(null);

export function TriageWorkspaceProvider({ children }: { children: ReactNode }) {
  const value: TriageWorkspaceSplitContext = { workspaceSplit: true };
  return <TriageWorkspaceContext.Provider value={value}>{children}</TriageWorkspaceContext.Provider>;
}

export function useTriageWorkspaceContext() {
  return useContext(TriageWorkspaceContext);
}
