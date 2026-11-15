"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { FinancialResults } from "@/domain/financials";
import { useOperationsCloudSync } from "@/components/use-operations-cloud-sync";
import type { Language } from "@/i18n/translations";
import { LEGACY_PLANNING_STORAGE_KEY, parseSavedPlanningState, PLANNING_STORAGE_KEY, type SavedPlanningState } from "@/domain/planning-storage";
import type { ThreeStatementAssumptions } from "@/domain/three-statements";\nimport { createEmptyCashForecast, parseStoredCashForecast, type CashForecastWeekInput } from "@/domain/cash-forecast";\nimport { parseStoredWorkingCapitalInvoices, type WorkingCapitalInvoice } from "@/domain/working-capital";
import { EMPTY_OPERATIONS, OPERATIONS_STORAGE_KEY, parseOperationsState, type OperationsState } from "@/domain/operations";

type WorkspaceDataValue = {
  financials: FinancialResults;
  operations: OperationsState;
  setOperations: Dispatch<SetStateAction<OperationsState>>;
  operationsLoaded: boolean;
  cloudStatus: string;
  planning: SavedPlanningState | null;
  setPlanning: Dispatch<SetStateAction<SavedPlanningState | null>>;
  statementAssumptions: ThreeStatementAssumptions | null;
  setStatementAssumptions: Dispatch<SetStateAction<ThreeStatementAssumptions | null>>;
};

const WorkspaceDataContext = createContext<WorkspaceDataValue | null>(null);

export function WorkspaceDataProvider({ financials, language, children }: { financials: FinancialResults; language: Language; children: ReactNode }) {
  const [operations, setOperations] = useState<OperationsState>(EMPTY_OPERATIONS);
  const [operationsLoaded, setOperationsLoaded] = useState(false);
  const [planning, setPlanning] = useState<SavedPlanningState | null>(null);
  const [statementAssumptions, setStatementAssumptions] = useState<ThreeStatementAssumptions | null>(null);\n  const [cashForecastWeeks, setCashForecastWeeks] = useState<CashForecastWeekInput[]>(() => createEmptyCashForecast(13));\n  const [workingCapitalInvoices, setWorkingCapitalInvoices] = useState<WorkingCapitalInvoice[]>([]);
  const cloudStatus = useOperationsCloudSync(operations, setOperations, operationsLoaded, language);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const restored = parseOperationsState(window.localStorage.getItem(OPERATIONS_STORAGE_KEY));
        if (restored) setOperations(restored);
        const planningRaw = window.localStorage.getItem(PLANNING_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_PLANNING_STORAGE_KEY);
        const restoredPlanning = planningRaw ? parseSavedPlanningState(planningRaw) : null;
        if (restoredPlanning) setPlanning(restoredPlanning);\n        const cashRaw = window.localStorage.getItem("enterpriseos:cash-forecast:v1");\n        const cashParsed = parseStoredCashForecast(cashRaw);\n        if (cashParsed.ok) setCashForecastWeeks(cashParsed.weeks);\n        const invoiceRaw = window.localStorage.getItem("enterpriseos:working-capital:v1");\n        const invoiceParsed = parseStoredWorkingCapitalInvoices(invoiceRaw);\n        if (invoiceParsed.ok) setWorkingCapitalInvoices(invoiceParsed.invoices);
      } catch {
        // The in-memory workspace remains usable if browser storage is unavailable.
      }
      setOperationsLoaded(true);
    }, 0);

    const onStorage = (event: StorageEvent) => {
      if (event.key === OPERATIONS_STORAGE_KEY) {
        const restored = parseOperationsState(event.newValue);
        if (restored) setOperations(restored);
      }
      if (event.key === PLANNING_STORAGE_KEY || event.key === LEGACY_PLANNING_STORAGE_KEY) {
        const restored = event.newValue ? parseSavedPlanningState(event.newValue) : null;
        if (restored) setPlanning(restored);
      }
    };
    const refreshCashAndInvoices = () => {
      try {
        const cash = parseStoredCashForecast(window.localStorage.getItem("enterpriseos:cash-forecast:v1"));
        if (cash.ok) setCashForecastWeeks(cash.weeks);
        const invoices = parseStoredWorkingCapitalInvoices(window.localStorage.getItem("enterpriseos:working-capital:v1"));
        if (invoices.ok) setWorkingCapitalInvoices(invoices.invoices);
      } catch { /* Keep the last valid in-memory snapshot if storage is unavailable. */ }
    };
    const onFinanceDataUpdated = () => refreshCashAndInvoices();
    window.addEventListener("enterpriseos:cash-forecast-updated", onFinanceDataUpdated);
    window.addEventListener("enterpriseos:working-capital-updated", onFinanceDataUpdated);
    window.addEventListener("storage", onFinanceDataUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);\n      window.removeEventListener("enterpriseos:cash-forecast-updated", onFinanceDataUpdated);\n      window.removeEventListener("enterpriseos:working-capital-updated", onFinanceDataUpdated);\n      window.removeEventListener("storage", onFinanceDataUpdated);
    };
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

  const value = useMemo(() => ({ financials, operations, setOperations, operationsLoaded, cloudStatus, planning, setPlanning, statementAssumptions, setStatementAssumptions, cashForecastWeeks, workingCapitalInvoices }), [financials, operations, operationsLoaded, cloudStatus, planning, statementAssumptions, cashForecastWeeks, workingCapitalInvoices]);
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

export function useWorkspaceData() {
  const value = useContext(WorkspaceDataContext);
  if (!value) throw new Error("useWorkspaceData must be used inside WorkspaceDataProvider");
  return value;
}
