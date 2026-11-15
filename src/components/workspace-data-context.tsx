"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { FinancialResults } from "@/domain/financials";
import { useOperationsCloudSync } from "@/components/use-operations-cloud-sync";
import type { Language } from "@/i18n/translations";
import { EMPTY_OPERATIONS, OPERATIONS_STORAGE_KEY, parseOperationsState, type OperationsState } from "@/domain/operations";

type WorkspaceDataValue = {
  financials: FinancialResults;
  operations: OperationsState;
  setOperations: Dispatch<SetStateAction<OperationsState>>;
  operationsLoaded: boolean;
  cloudStatus: string;
};

const WorkspaceDataContext = createContext<WorkspaceDataValue | null>(null);

export function WorkspaceDataProvider({ financials, language, children }: { financials: FinancialResults; language: Language; children: ReactNode }) {
  const [operations, setOperations] = useState<OperationsState>(EMPTY_OPERATIONS);
  const [operationsLoaded, setOperationsLoaded] = useState(false);
  const cloudStatus = useOperationsCloudSync(operations, setOperations, operationsLoaded, language);

  useEffect(() => {
    try {
      const restored = parseOperationsState(window.localStorage.getItem(OPERATIONS_STORAGE_KEY));
      if (restored) setOperations(restored);
    } catch {
      // The in-memory workspace remains usable if browser storage is unavailable.
    }
    setOperationsLoaded(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== OPERATIONS_STORAGE_KEY) return;
      const restored = parseOperationsState(event.newValue);
      if (restored) setOperations(restored);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!operationsLoaded) return;
    try {
      window.localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(operations));
      window.dispatchEvent(new CustomEvent("enterpriseos:workspace-data-updated", { detail: { source: "operations" } }));
    } catch {
      // State remains live in React even when persistence is blocked.
    }
  }, [operations, operationsLoaded]);

  const value = useMemo(() => ({ financials, operations, setOperations, operationsLoaded, cloudStatus }), [financials, operations, operationsLoaded, cloudStatus]);
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

export function useWorkspaceData() {
  const value = useContext(WorkspaceDataContext);
  if (!value) throw new Error("useWorkspaceData must be used inside WorkspaceDataProvider");
  return value;
}
