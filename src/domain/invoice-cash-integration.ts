import type { WorkingCapitalInvoice } from "@/domain/working-capital";

export type InvoiceCashWeek = {
  receivableCollections: number;
  payablePayments: number;
  receivableCount: number;
  payableCount: number;
  overdueReceivables: number;
  overduePayables: number;
};

/**
 * Allocates each invoice's outstanding balance to the week containing its due date.
 * Invoices already overdue at the forecast start are placed in week one so they
 * remain visible as an immediate cash risk. Invoices beyond the horizon are omitted.
 */
export function allocateInvoicesToCashWeeks(
  invoices: WorkingCapitalInvoice[],
  firstWeekStart: string,
  weekCount = 13,
): InvoiceCashWeek[] {
  const weeks = Array.from({ length: Math.max(0, Math.floor(weekCount)) }, (): InvoiceCashWeek => ({
    receivableCollections: 0,
    payablePayments: 0,
    receivableCount: 0,
    payableCount: 0,
    overdueReceivables: 0,
    overduePayables: 0,
  }));
  const startDay = dateOrdinal(firstWeekStart);
  if (startDay === null || weeks.length === 0) return weeks;

  for (const invoice of invoices) {
    const amount = Number.isFinite(invoice.amount) ? Math.max(0, invoice.amount) : 0;
    const paid = Number.isFinite(invoice.paidAmount) ? Math.max(0, invoice.paidAmount) : 0;
    const outstanding = roundMoney(Math.max(0, amount - Math.min(amount, paid)));
    const dueDay = dateOrdinal(invoice.dueDate);
    if (outstanding <= 0 || dueDay === null) continue;

    const difference = dueDay - startDay;
    const weekIndex = difference < 0 ? 0 : Math.floor(difference / 7);
    const target = weeks[weekIndex];
    if (!target) continue;

    if (invoice.direction === "receivable") {
      target.receivableCollections = roundMoney(target.receivableCollections + outstanding);
      target.receivableCount += 1;
      if (difference < 0) target.overdueReceivables = roundMoney(target.overdueReceivables + outstanding);
    } else if (invoice.direction === "payable") {
      target.payablePayments = roundMoney(target.payablePayments + outstanding);
      target.payableCount += 1;
      if (difference < 0) target.overduePayables = roundMoney(target.overduePayables + outstanding);
    }
  }

  return weeks;
}

function dateOrdinal(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return Math.floor(timestamp / 86400000);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
