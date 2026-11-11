import { describe, expect, it } from "vitest";
import { createEmptyCashForecast } from "./cash-forecast";
import { createLocalFinanceBackup, parseLocalFinanceBackup, parseStoredFinanceBackupSections } from "./cash-working-capital-backup";
import type { WorkingCapitalInvoice } from "./working-capital";
import { addPlanningYear, createInitialPlanningState, parseSavedPlanningState, serialisePlanningState } from "./planning-storage";

const invoice = (overrides: Partial<WorkingCapitalInvoice> = {}): WorkingCapitalInvoice => ({
  id: "invoice-1",
  direction: "receivable",
  counterparty: "Acme Ltd",
  reference: "INV-100",
  issueDate: "2026-11-01",
  dueDate: "2026-11-20",
  amount: 1250,
  paidAmount: 250,
  ...overrides,
});

describe("local finance backup", () => {
  it("includes and restores operations records", () => {
    const operations = {
      opportunities: [{ id: "deal-1", company: "Acme", contact: "", value: 5000, stage: "proposal" as const, expectedClose: "2026-12-01" }],
      projects: [],
      risks: [],
      kpis: [],
      costCenters: [],
      expenses: [],
    };
    const backup = createLocalFinanceBackup([], createEmptyCashForecast(13), undefined, null, operations);
    const restored = parseLocalFinanceBackup(JSON.stringify(backup));
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.data.operationsState?.opportunities[0].company).toBe("Acme");
  });

  it("rejects corrupted saved planning and operations sections before backup", () => {
    const validPlanning = JSON.stringify(createInitialPlanningState({
      annualRevenueBudget: 2_976_000,
      costOfGoodsSoldPercent: 39,
      annualOperatingExpenses: 1_060_800,
      annualDepreciationAndAmortisation: 150_000,
      annualInterestExpense: 50_400,
      taxRatePercent: 25,
    }, {}, "base", "2026-11-11T10:00:00.000Z"));
    expect(parseStoredFinanceBackupSections("{broken", null, null).ok).toBe(false);
    expect(parseStoredFinanceBackupSections(null, null, "{broken").ok).toBe(false);
    expect(parseStoredFinanceBackupSections(validPlanning, null, null).ok).toBe(true);
    expect(parseStoredFinanceBackupSections(null, validPlanning, null).ok).toBe(true);
    expect(parseStoredFinanceBackupSections(null, null, null)).toMatchObject({
      ok: true, planningState: null, operationsState: null,
    });
  });

  it("rejects corrupted operations data before restore", () => {
    const backup = createLocalFinanceBackup([], createEmptyCashForecast(13));
    (backup as { operationsState?: unknown }).operationsState = { projects: "not-an-array" };
    expect(parseLocalFinanceBackup(JSON.stringify(backup)).ok).toBe(false);
  });
  it("round-trips invoices and 13-week forecast data", () => {
    const backup = createLocalFinanceBackup(
      [invoice()],
      [{ collections: 100, operatingPayments: 25, capitalExpenditure: 0, debtService: 0 }, ...createEmptyCashForecast(12)],
      "2026-11-09T14:00:00.000Z",
    );

    const restored = parseLocalFinanceBackup(JSON.stringify(backup));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.workingCapitalInvoices[0].amount).toBe(1250);
    expect(restored.data.quarterlyCashForecast[0].collections).toBe(100);
    expect(restored.data.quarterlyCashForecast).toHaveLength(13);
  });

  it("round-trips dated payment history without changing legacy balances", () => {
    const source = invoice({
      paidAmount: 550,
      payments: [{ id: "payment-1", date: "2026-11-08", amount: 300, note: "Bank transfer" }],
    });
    const backup = createLocalFinanceBackup([source], createEmptyCashForecast(13));
    const restored = parseLocalFinanceBackup(JSON.stringify(backup));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.workingCapitalInvoices[0].paidAmount).toBe(550);
    expect(restored.data.workingCapitalInvoices[0].payments).toEqual([
      { id: "payment-1", date: "2026-11-08", amount: 300, note: "Bank transfer" },
    ]);
  });

  it("upgrades version 1 backups and preserves legacy paid balances", () => {
    const legacy = createLocalFinanceBackup([invoice()], createEmptyCashForecast(13));
    const versionOne = { ...legacy, schemaVersion: 1 };
    const restored = parseLocalFinanceBackup(JSON.stringify(versionOne));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.schemaVersion).toBe(3);
    expect(restored.data.workingCapitalInvoices[0].paidAmount).toBe(250);
    expect(restored.data.workingCapitalInvoices[0].payments).toEqual([]);
  });

  it("rejects malformed files without producing partial data", () => {
    expect(parseLocalFinanceBackup("{broken").ok).toBe(false);
    expect(parseLocalFinanceBackup(JSON.stringify({ product: "Other", schemaVersion: 1 })).ok).toBe(false);
  });

  it("rejects duplicate customer or supplier invoice references in a backup", () => {
    const duplicateReference = createLocalFinanceBackup([
      invoice(),
      invoice({ id: "invoice-2", counterparty: " acme ltd ", reference: " inv-100 " }),
    ], createEmptyCashForecast(13));
    expect(parseLocalFinanceBackup(JSON.stringify(duplicateReference))).toMatchObject({
      ok: false,
      error: "The backup contains duplicate invoices for the same customer or supplier and reference.",
    });
  });

  it("rejects duplicate invoice IDs and impossible invoice dates", () => {
    const duplicate = createLocalFinanceBackup([invoice(), invoice()], createEmptyCashForecast());
    const invalidDate = createLocalFinanceBackup([invoice({ id: "bad", dueDate: "2026-02-30" })], createEmptyCashForecast());
    expect(parseLocalFinanceBackup(JSON.stringify(duplicate)).ok).toBe(false);
    expect(parseLocalFinanceBackup(JSON.stringify(invalidDate)).ok).toBe(false);
  });

  it("migrates version 1 and 2 backups with the legacy flat planning model", () => {
    const assumptions = {
      annualRevenueBudget: 2_976_000,
      costOfGoodsSoldPercent: 39,
      annualOperatingExpenses: 1_060_800,
      annualDepreciationAndAmortisation: 150_000,
      annualInterestExpense: 50_400,
      taxRatePercent: 25,
    };
    const legacyPlanning = {
      assumptions,
      actualRevenue: { Jan: 250_000, Feb: null },
      scenario: "upside",
      savedAt: "2026-11-09T14:00:00.000Z",
    };
    const current = createLocalFinanceBackup([invoice()], createEmptyCashForecast(13));
    for (const version of [1, 2]) {
      const oldBackup = { ...current, schemaVersion: version, planningState: legacyPlanning };
      const restored = parseLocalFinanceBackup(JSON.stringify(oldBackup));
      expect(restored.ok).toBe(true);
      if (!restored.ok) continue;
      expect(restored.data.schemaVersion).toBe(3);
      expect(restored.data.planningState?.selectedYear).toBe(2026);
      expect(restored.data.planningState?.years["2026"].actualRevenue.Jan).toBe(250_000);
      expect(restored.data.planningState?.years["2026"].scenario).toBe("upside");
    }
  });

  it("includes and restores the saved multi-year planning model", () => {
    const assumptions = {
      annualRevenueBudget: 2_976_000,
      costOfGoodsSoldPercent: 39,
      annualOperatingExpenses: 1_060_800,
      annualDepreciationAndAmortisation: 150_000,
      annualInterestExpense: 50_400,
      taxRatePercent: 25,
    };
    const initial = createInitialPlanningState(assumptions, { Jan: 250_000, Feb: null }, "upside", "2026-11-09T14:00:00.000Z");
    const planning = parseSavedPlanningState(serialisePlanningState(addPlanningYear(initial, 2027)!, "2026-11-09T15:00:00.000Z"));
    const backup = createLocalFinanceBackup([], createEmptyCashForecast(13), undefined, planning);
    const restored = parseLocalFinanceBackup(JSON.stringify(backup));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.data.planningState?.selectedYear).toBe(2027);
    expect(restored.data.planningState?.years["2026"].scenario).toBe("upside");
    expect(restored.data.planningState?.years["2026"].actualRevenue.Jan).toBe(250_000);
    expect(restored.data.planningState?.years["2027"].actualRevenue.Jan).toBeNull();
  });

  it("rejects a corrupted planning model inside an otherwise valid backup", () => {
    const backup = createLocalFinanceBackup([], createEmptyCashForecast(13));
    (backup as { planningState?: unknown }).planningState = { scenario: "unknown" };
    expect(parseLocalFinanceBackup(JSON.stringify(backup)).ok).toBe(false);
  });

  it("rejects a missing or invalid backup export timestamp", () => {
    const backup = createLocalFinanceBackup([], createEmptyCashForecast(13));
    expect(parseLocalFinanceBackup(JSON.stringify({ ...backup, exportedAt: "" })).ok).toBe(false);
    expect(parseLocalFinanceBackup(JSON.stringify({ ...backup, exportedAt: "not-a-date" })).ok).toBe(false);
  });

  it("rejects incomplete forecasts and negative cash inputs", () => {
    const tooShort = createLocalFinanceBackup([], createEmptyCashForecast(12));
    const invalidWeek = createLocalFinanceBackup([], createEmptyCashForecast());
    invalidWeek.quarterlyCashForecast[0].debtService = -1;

    expect(parseLocalFinanceBackup(JSON.stringify(tooShort)).ok).toBe(false);
    expect(parseLocalFinanceBackup(JSON.stringify(invalidWeek)).ok).toBe(false);
  });
});
