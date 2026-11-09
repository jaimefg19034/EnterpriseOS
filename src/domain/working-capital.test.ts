import { describe, expect, it } from "vitest";
import { calculateInvoiceAgeing, findDuplicateInvoice, normaliseInvoice, summarizeInvoices, validateWorkingCapitalInvoice, type WorkingCapitalInvoice } from "./working-capital";

const invoice = (overrides: Partial<WorkingCapitalInvoice> = {}): WorkingCapitalInvoice => ({
  id: "inv-1", direction: "receivable", counterparty: "Acme", reference: "INV-1",
  issueDate: "2026-10-01", dueDate: "2026-10-01", amount: 1000, paidAmount: 200, ...overrides,
});

describe("working capital invoice validation", () => {
  it("rejects impossible dates, reversed dates and invalid payment balances", () => {
    expect(validateWorkingCapitalInvoice(invoice({ dueDate: "2026-02-30" })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({ issueDate: "2026-11-10", dueDate: "2026-11-09" })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({ paidAmount: 1001 })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({ amount: 0 })).valid).toBe(false);
  });

  it("requires a counterparty and a reference", () => {
    expect(validateWorkingCapitalInvoice(invoice({ counterparty: " " })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({ reference: "" })).valid).toBe(false);
  });

  it("rounds invoice and paid balances to cents", () => {
    const clean = normaliseInvoice(invoice({ amount: 10.105, paidAmount: 2.105 }));
    expect(clean.amount).toBe(10.11);
    expect(clean.paidAmount).toBe(2.11);
  });
});

describe("duplicate invoice detection", () => {
  it("matches direction, counterparty and reference without case or whitespace differences", () => {
    const existing = invoice();
    expect(findDuplicateInvoice({ direction: "receivable", counterparty: " acme ", reference: "inv-1" }, [existing])).toEqual(existing);
    expect(findDuplicateInvoice({ direction: "payable", counterparty: "Acme", reference: "INV-1" }, [existing])).toBeUndefined();
    expect(findDuplicateInvoice({ direction: "receivable", counterparty: "Acme", reference: "INV-2" }, [existing])).toBeUndefined();
  });
});

describe("working capital invoice ageing", () => {
  it("assigns overdue balances to the correct ageing bucket", () => {
    const rows = calculateInvoiceAgeing([
      invoice(),
      invoice({ id: "2", dueDate: "2026-08-01" }),
      invoice({ id: "3", dueDate: "2026-07-01" }),
    ], "2026-11-09");
    expect(rows.map((row) => row.bucket)).toEqual(["31to60", "over90", "over90"]);
    expect(rows[0].outstanding).toBe(800);
  });

  it("does not count fully paid invoices as overdue", () => {
    const [row] = calculateInvoiceAgeing([invoice({ paidAmount: 1000 })], "2026-11-09");
    expect(row.outstanding).toBe(0);
    expect(row.overdueDays).toBe(0);
  });

  it("summarises overdue and upcoming balances without double counting", () => {
    const rows = calculateInvoiceAgeing([
      invoice({ dueDate: "2026-11-12", amount: 500, paidAmount: 0 }),
      invoice({ id: "2", dueDate: "2026-11-20", amount: 300, paidAmount: 0 }),
      invoice({ id: "3", dueDate: "2026-10-01", amount: 200, paidAmount: 0 }),
    ], "2026-11-09");
    const summary = summarizeInvoices(rows, "2026-11-09");
    expect(summary.outstanding).toBe(1000);
    expect(summary.overdue).toBe(200);
    expect(summary.dueNext7Days).toBe(500);
    expect(summary.dueNext30Days).toBe(800);
  });
});
