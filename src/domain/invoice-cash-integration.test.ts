import { describe, expect, it } from "vitest";
import { allocateInvoicesToCashWeeks } from "./invoice-cash-integration";
import type { WorkingCapitalInvoice } from "./working-capital";

const invoice = (overrides: Partial<WorkingCapitalInvoice> = {}): WorkingCapitalInvoice => ({
  id: "inv-1",
  direction: "receivable",
  counterparty: "Acme",
  reference: "INV-1",
  issueDate: "2026-11-01",
  dueDate: "2026-11-10",
  amount: 1000,
  paidAmount: 200,
  ...overrides,
});

describe("invoice cash forecast integration", () => {
  it("allocates receivables and payables to the week containing their due date", () => {
    const result = allocateInvoicesToCashWeeks([
      invoice(),
      invoice({ id: "inv-2", direction: "payable", dueDate: "2026-11-16", amount: 600, paidAmount: 100 }),
    ], "2026-11-09", 3);

    expect(result[0].receivableCollections).toBe(800);
    expect(result[0].receivableCount).toBe(1);
    expect(result[1].payablePayments).toBe(500);
    expect(result[1].payableCount).toBe(1);
  });

  it("places overdue invoices in the first week and flags their balances", () => {
    const result = allocateInvoicesToCashWeeks([
      invoice({ dueDate: "2026-11-01" }),
      invoice({ id: "inv-2", direction: "payable", dueDate: "2026-11-08", amount: 450, paidAmount: 0 }),
    ], "2026-11-09", 2);

    expect(result[0].receivableCollections).toBe(800);
    expect(result[0].overdueReceivables).toBe(800);
    expect(result[0].payablePayments).toBe(450);
    expect(result[0].overduePayables).toBe(450);
  });

  it("excludes paid invoices, invalid dates and invoices outside the forecast horizon", () => {
    const result = allocateInvoicesToCashWeeks([
      invoice({ paidAmount: 1000 }),
      invoice({ id: "bad-date", dueDate: "2026-02-30" }),
      invoice({ id: "future", dueDate: "2027-01-01" }),
    ], "2026-11-09", 13);

    expect(result.reduce((sum, week) => sum + week.receivableCollections + week.payablePayments, 0)).toBe(0);
    expect(result).toHaveLength(13);
  });

  it("rounds allocations to cents and safely handles invalid forecast inputs", () => {
    const result = allocateInvoicesToCashWeeks([
      invoice({ amount: 10.105, paidAmount: 0 }),
      invoice({ id: "second", amount: 10.105, paidAmount: 0 }),
    ], "2026-11-09", 13);

    expect(result).toHaveLength(13);
    expect(result[0].receivableCollections).toBe(20.22);
  });
});
