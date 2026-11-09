import { describe, expect, it } from "vitest";
import { createEmptyCashForecast } from "./cash-forecast";
import { createLocalFinanceBackup, parseLocalFinanceBackup } from "./cash-working-capital-backup";
import type { WorkingCapitalInvoice } from "./working-capital";

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

  it("rejects malformed files without producing partial data", () => {
    expect(parseLocalFinanceBackup("{broken").ok).toBe(false);
    expect(parseLocalFinanceBackup(JSON.stringify({ product: "Other", schemaVersion: 1 })).ok).toBe(false);
  });

  it("rejects duplicate invoice IDs and impossible invoice dates", () => {
    const duplicate = createLocalFinanceBackup([invoice(), invoice()], createEmptyCashForecast());
    const invalidDate = createLocalFinanceBackup([invoice({ id: "bad", dueDate: "2026-02-30" })], createEmptyCashForecast());
    expect(parseLocalFinanceBackup(JSON.stringify(duplicate)).ok).toBe(false);
    expect(parseLocalFinanceBackup(JSON.stringify(invalidDate)).ok).toBe(false);
  });

  it("rejects incomplete forecasts and negative cash inputs", () => {
    const tooShort = createLocalFinanceBackup([], createEmptyCashForecast(12));
    const invalidWeek = createLocalFinanceBackup([], createEmptyCashForecast());
    invalidWeek.quarterlyCashForecast[0].debtService = -1;

    expect(parseLocalFinanceBackup(JSON.stringify(tooShort)).ok).toBe(false);
    expect(parseLocalFinanceBackup(JSON.stringify(invalidWeek)).ok).toBe(false);
  });
});
