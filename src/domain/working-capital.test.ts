import { describe, expect, it } from "vitest";
import { addInvoicePayment, calculateInvoiceAgeing, findDuplicateInvoice, normaliseInvoice, parseInvoiceCsv, summarizeInvoices, validateWorkingCapitalInvoice, type WorkingCapitalInvoice } from "./working-capital";

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


  it("uses strict shared calendar validation for early years and year zero", () => {
    expect(validateWorkingCapitalInvoice(invoice({
      issueDate: "0000-01-01",
      dueDate: "0000-01-02",
    })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({
      issueDate: "0099-12-30",
      dueDate: "0099-12-31",
    })).valid).toBe(true);
  });

  it("requires a counterparty and a reference", () => {
    expect(validateWorkingCapitalInvoice(invoice({ counterparty: " " })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({ reference: "" })).valid).toBe(false);
  });

  it("migrates legacy paid balances without inventing payment dates", () => {
    const legacy = normaliseInvoice(invoice({ paidAmount: 250 }));
    expect(legacy.paidAmount).toBe(250);
    expect(legacy.payments).toEqual([]);
  });

  it("records dated partial payments and updates the outstanding balance", () => {
    const result = addInvoicePayment(invoice({ paidAmount: 0 }), {
      id: "payment-1", date: "2026-11-05", amount: 300, note: "Bank transfer",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.invoice.paidAmount).toBe(300);
    expect(result.invoice.amount - result.invoice.paidAmount).toBe(700);
    expect(result.invoice.payments).toHaveLength(1);
  });

  it("rejects duplicate, invalid and overpayment transactions", () => {
    const first = addInvoicePayment(invoice({ paidAmount: 0 }), {
      id: "payment-1", date: "2026-11-05", amount: 300,
    });
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(addInvoicePayment(first.invoice, { id: "payment-1", date: "2026-11-06", amount: 100 }).valid).toBe(false);
    expect(addInvoicePayment(first.invoice, { id: "payment-2", date: "2026-02-30", amount: 100 }).valid).toBe(false);
    expect(addInvoicePayment(first.invoice, { id: "payment-3", date: "2026-11-06", amount: 701 }).valid).toBe(false);
  });

  it("normalises payment precision before checking the outstanding balance", () => {
    const result = addInvoicePayment(invoice({ amount: 100, paidAmount: 0 }), {
      id: "rounded", date: "2026-11-05", amount: 99.999,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.invoice.paidAmount).toBe(100);
      expect(result.invoice.payments?.[0].amount).toBe(100);
      expect(validateWorkingCapitalInvoice(result.invoice).valid).toBe(true);
    }
    expect(addInvoicePayment(invoice({ amount: 100, paidAmount: 0 }), {
      id: "over", date: "2026-11-05", amount: 100.006,
    }).valid).toBe(false);
  });

  it("rejects payment amounts that round to zero cents", () => {
    expect(addInvoicePayment(invoice({ paidAmount: 0 }), {
      id: "tiny", date: "2026-11-05", amount: 0.001,
    }).valid).toBe(false);
  });

  it("rejects payment history that exceeds the recorded paid balance", () => {
    expect(validateWorkingCapitalInvoice(invoice({
      paidAmount: 100,
      payments: [{ id: "p1", date: "2026-11-05", amount: 101 }],
    })).valid).toBe(false);
  });

  it("rounds invoice and paid balances to cents", () => {
    const clean = normaliseInvoice(invoice({ amount: 10.105, paidAmount: 2.105 }));
    expect(clean.amount).toBe(10.11);
    expect(clean.paidAmount).toBe(2.11);
  });
});

describe("invoice CSV import", () => {
  it("parses a semicolon-delimited Spanish export with decimal commas", () => {
    const result = parseInvoiceCsv("tipo;cliente/proveedor;referencia;fecha_emision;fecha_vencimiento;importe;importe_pagado\ncobrar;Acme;F-100;01/11/2026;20/11/2026;1.250,50;250,50");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoices[0]).toMatchObject({ direction: "receivable", counterparty: "Acme", amount: 1250.5, paidAmount: 250.5, issueDate: "2026-11-01" });
  });

  it("rejects missing columns, malformed quoting and invalid rows without partial import", () => {
    expect(parseInvoiceCsv("company,amount\nAcme,10").ok).toBe(false);
    expect(parseInvoiceCsv('direction,counterparty,reference,issueDate,dueDate,amount,paidAmount\nreceivable,"Acme,INV-1,2026-11-01,2026-11-02,10,0').ok).toBe(false);
    expect(parseInvoiceCsv("direction,counterparty,reference,issueDate,dueDate,amount,paidAmount\nreceivable,Acme,INV-1,2026-11-01,2026-11-02,10,0\nreceivable,Acme,INV-2,2026-11-01,2026-11-02,-5,0").ok).toBe(false);
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

  it("calculates calendar-day ageing across daylight-saving transitions", () => {
    const spring = calculateInvoiceAgeing([invoice({ dueDate: "2026-03-29" })], "2026-03-30")[0];
    const autumn = calculateInvoiceAgeing([invoice({ dueDate: "2026-10-25" })], "2026-10-26")[0];
    expect(spring.overdueDays).toBe(1);
    expect(autumn.overdueDays).toBe(1);
  });

  it("counts upcoming due dates by calendar day across daylight-saving transitions", () => {
    const rows = calculateInvoiceAgeing([
      invoice({ dueDate: "2026-03-29", amount: 100, paidAmount: 0 }),
      invoice({ id: "2", dueDate: "2026-04-05", amount: 200, paidAmount: 0 }),
    ], "2026-03-29");
    const summary = summarizeInvoices(rows, "2026-03-29");
    expect(summary.dueNext7Days).toBe(300);
    expect(summary.dueNext30Days).toBe(300);
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
