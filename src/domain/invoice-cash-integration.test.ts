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
  it("reduces the forecast by dated payments without forecasting those payments again", () => {
    const partiallyPaid = invoice({ amount: 1000, paidAmount: 500, payments: [
      { id: "p-1", date: "2026-11-08", amount: 300 },
    ] });
    const fullyPaid = invoice({ id: "paid", amount: 500, paidAmount: 500, payments: [
      { id: "p-2", date: "2026-11-08", amount: 500 },
    ] });
    const result = allocateInvoicesToCashWeeks([partiallyPaid, fullyPaid], "2026-11-09", 2);

    expect(result[0].receivableCollections).toBe(500);
    expect(result[0].receivableCount).toBe(1);
    expect(result.reduce((total, week) => total + week.receivableCollections, 0)).toBe(500);
  });

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

  it("flags invoices that became overdue earlier in the current week", () => {
    const result = allocateInvoicesToCashWeeks([
      invoice({ dueDate: "2026-11-10" }),
    ], "2026-11-09", 2, "2026-11-12");

    expect(result[0].receivableCollections).toBe(800);
    expect(result[0].overdueReceivables).toBe(800);
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
      invoice({ id: "future", dueDate: "2027-03-01" }),
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

  it("rejects year zero and impossible dates through the shared UTC parser", () => {
    const invoices = [
      invoice({ id: "year-zero", dueDate: "0000-12-31" }),
      invoice({ id: "impossible", dueDate: "0099-02-29" }),
    ];
    const invalidStart = allocateInvoicesToCashWeeks(invoices, "0000-01-01", 2);
    const validEarlyYear = allocateInvoicesToCashWeeks(
      [invoice({ dueDate: "0099-12-31" })],
      "0099-12-30",
      2,
    );

    expect(invalidStart).toHaveLength(2);
    expect(invalidStart.every((week) => week.receivableCollections === 0)).toBe(true);
    expect(validEarlyYear[0].receivableCollections).toBe(800);
  });

});
