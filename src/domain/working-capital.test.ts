import { describe, expect, it } from "vitest";
import { addInvoicePayment, calculateInvoiceAgeing, findDuplicateInvoice, findFutureDatedInvoicePayments, normaliseInvoice, parseInvoiceCsv, parseStoredWorkingCapitalInvoices, removeFutureInvoicePayment, summarizeInvoices, validateWorkingCapitalInvoice, type WorkingCapitalInvoice } from "./working-capital";

const invoice = (overrides: Partial<WorkingCapitalInvoice> = {}): WorkingCapitalInvoice => ({
  id: "inv-1", direction: "receivable", counterparty: "Acme", reference: "INV-1",
  issueDate: "2026-10-01", dueDate: "2026-10-01", amount: 1000, paidAmount: 200, ...overrides,
});

describe("legacy future-dated invoice payment recovery", () => {
  it("detects future-dated payment records without changing invoice data", () => {
    const source = invoice({
      paidAmount: 300,
      payments: [
        { id: "past", date: "2026-11-10", amount: 100 },
        { id: "future", date: "2026-11-15", amount: 200 },
      ],
    });
    expect(findFutureDatedInvoicePayments([source], "2026-11-12")).toEqual([{
      invoiceId: "inv-1",
      invoiceReference: "INV-1",
      counterparty: "Acme",
      payment: { id: "future", date: "2026-11-15", amount: 200 },
    }]);
    expect(source.paidAmount).toBe(300);
    expect(source.payments).toHaveLength(2);
  });

  it("removes only a future-dated payment and restores the outstanding balance", () => {
    const source = invoice({
      paidAmount: 300,
      payments: [
        { id: "past", date: "2026-11-10", amount: 100 },
        { id: "future", date: "2026-11-15", amount: 200 },
      ],
    });
    const result = removeFutureInvoicePayment(source, "future", "2026-11-12");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.invoice.paidAmount).toBe(100);
      expect(result.invoice.payments).toEqual([{ id: "past", date: "2026-11-10", amount: 100 }]);
      expect(source.paidAmount).toBe(300);
      expect(source.payments).toHaveLength(2);
    }
  });

  it("preserves undated legacy paid balances when removing a future payment", () => {
    const source = invoice({
      paidAmount: 600,
      payments: [
        { id: "past", date: "2026-11-10", amount: 100 },
        { id: "future", date: "2026-11-15", amount: 200 },
      ],
    });
    const result = removeFutureInvoicePayment(source, "future", "2026-11-12");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.invoice.paidAmount).toBe(400);
    expect(result.invoice.payments).toEqual([{ id: "past", date: "2026-11-10", amount: 100 }]);
    expect(result.invoice.paidAmount - result.invoice.payments!.reduce((sum, payment) => sum + payment.amount, 0)).toBe(300);
  });

  it("does not allow this recovery action to remove a past or missing payment", () => {
    const source = invoice({
      paidAmount: 100,
      payments: [{ id: "past", date: "2026-11-10", amount: 100 }],
    });
    expect(removeFutureInvoicePayment(source, "past", "2026-11-12")).toMatchObject({ valid: false });
    expect(removeFutureInvoicePayment(source, "missing", "2026-11-12")).toMatchObject({ valid: false });
  });
});

describe("stored working capital invoice recovery", () => {
  it("treats an absent register as an empty register", () => {
    expect(parseStoredWorkingCapitalInvoices(null)).toEqual({ ok: true, invoices: [] });
  });

  it("rejects malformed or partially invalid saved data without returning a partial register", () => {
    expect(parseStoredWorkingCapitalInvoices("{broken").ok).toBe(false);
    expect(parseStoredWorkingCapitalInvoices(JSON.stringify([invoice(), { id: "bad" }]))).toMatchObject({ ok: false });
    expect(parseStoredWorkingCapitalInvoices(JSON.stringify({ invoices: [] }))).toMatchObject({ ok: false });
  });

  it("rejects duplicate IDs and duplicate invoice identities in saved data", () => {
    expect(parseStoredWorkingCapitalInvoices(JSON.stringify([invoice(), invoice()]))).toMatchObject({ ok: false });
    expect(parseStoredWorkingCapitalInvoices(JSON.stringify([
      invoice(), invoice({ id: "inv-2", counterparty: " acme ", reference: " inv-1 " }),
    ]))).toMatchObject({ ok: false });
  });

  it("returns every valid saved invoice after normalisation", () => {
    const result = parseStoredWorkingCapitalInvoices(JSON.stringify([invoice({ counterparty: " Acme " })]));
    expect(result).toMatchObject({ ok: true, invoices: [{ counterparty: "Acme" }] });
  });
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
    }, "2026-11-12");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.invoice.paidAmount).toBe(300);
    expect(result.invoice.amount - result.invoice.paidAmount).toBe(700);
    expect(result.invoice.payments).toHaveLength(1);
  });

  it("rejects future-dated actual payments and allows payments dated today", () => {
    const source = invoice({ paidAmount: 0 });
    expect(addInvoicePayment(source, {
      id: "future", date: "2026-11-13", amount: 10,
    }, "2026-11-12")).toMatchObject({
      valid: false,
      error: "Payment date cannot be in the future.",
    });
    expect(addInvoicePayment(source, {
      id: "today", date: "2026-11-12", amount: 10,
    }, "2026-11-12")).toMatchObject({ valid: true });
  });

  it("rejects duplicate, invalid and overpayment transactions", () => {
    const first = addInvoicePayment(invoice({ paidAmount: 0 }), {
      id: "payment-1", date: "2026-11-05", amount: 300,
    }, "2026-11-12");
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(addInvoicePayment(first.invoice, { id: "payment-1", date: "2026-11-06", amount: 100 }, "2026-11-12").valid).toBe(false);
    expect(addInvoicePayment(first.invoice, { id: "payment-2", date: "2026-02-30", amount: 100 }, "2026-11-12").valid).toBe(false);
    expect(addInvoicePayment(first.invoice, { id: "payment-3", date: "2026-11-06", amount: 701 }, "2026-11-12").valid).toBe(false);
  });

  it("normalises payment precision before checking the outstanding balance", () => {
    const result = addInvoicePayment(invoice({ amount: 100, paidAmount: 0 }), {
      id: "rounded", date: "2026-11-05", amount: 99.999,
    }, "2026-11-12");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.invoice.paidAmount).toBe(100);
      expect(result.invoice.payments?.[0].amount).toBe(100);
      expect(validateWorkingCapitalInvoice(result.invoice).valid).toBe(true);
    }
    expect(addInvoicePayment(invoice({ amount: 100, paidAmount: 0 }), {
      id: "over", date: "2026-11-05", amount: 100.006,
    }, "2026-11-12").valid).toBe(false);
  });

  it("rejects payments dated before the invoice and normalises payment IDs", () => {
    const source = invoice({ issueDate: "2026-11-10", paidAmount: 0 });
    expect(addInvoicePayment(source, {
      id: "early", date: "2026-11-09", amount: 10,
    }, "2026-11-12")).toMatchObject({ valid: false });
    expect(validateWorkingCapitalInvoice({
      ...source,
      paidAmount: 10,
      payments: [{ id: "early", date: "2026-11-09", amount: 10 }],
    })).toMatchObject({ valid: false });
    const added = addInvoicePayment(source, {
      id: "  payment-trimmed  ", date: "2026-11-10", amount: 10,
    }, "2026-11-12");
    expect(added.valid).toBe(true);
    if (added.valid) expect(added.invoice.payments?.[0].id).toBe("payment-trimmed");
  });

  it("rejects payment amounts that round to zero cents", () => {
    expect(addInvoicePayment(invoice({ paidAmount: 0 }), {
      id: "tiny", date: "2026-11-05", amount: 0.001,
    }, "2026-11-12").valid).toBe(false);
  });

  it("rejects payment history that exceeds the recorded paid balance", () => {
    expect(validateWorkingCapitalInvoice(invoice({
      paidAmount: 100,
      payments: [{ id: "p1", date: "2026-11-05", amount: 101 }],
    })).valid).toBe(false);
  });

  it("rejects duplicate payment IDs and totals that exceed the paid balance after cent rounding", () => {
    expect(validateWorkingCapitalInvoice(invoice({
      paidAmount: 100,
      payments: [
        { id: "same", date: "2026-11-05", amount: 50 },
        { id: "same", date: "2026-11-06", amount: 50 },
      ],
    })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({
      paidAmount: 100,
      payments: [{ id: "rounding-over", date: "2026-11-05", amount: 100.005 }],
    })).valid).toBe(false);
    expect(validateWorkingCapitalInvoice(invoice({
      paidAmount: 100,
      payments: [{ id: "rounding-equal", date: "2026-11-05", amount: 99.999 }],
    })).valid).toBe(true);
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

  it("handles escaped quotes in quoted fields and rejects invalid quote placement", () => {
    const valid = parseInvoiceCsv(
      'direction,counterparty,reference,issueDate,dueDate,amount,paidAmount\nreceivable,"Acme, \"\"North\"\" Ltd",INV-1,2026-11-01,2026-11-20,100,0',
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.invoices[0].counterparty).toBe('Acme, "North" Ltd');

    expect(parseInvoiceCsv(
      'direction,counterparty,reference,issueDate,dueDate,amount,paidAmount\nreceivable,Acme "North",INV-1,2026-11-01,2026-11-20,100,0',
    ).ok).toBe(false);
    expect(parseInvoiceCsv(
      'direction,counterparty,reference,issueDate,dueDate,amount,paidAmount\nreceivable,"Acme"Ltd,INV-1,2026-11-01,2026-11-20,100,0',
    ).ok).toBe(false);
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
