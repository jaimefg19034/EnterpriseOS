export type InvoiceDirection = "receivable" | "payable";

export type WorkingCapitalInvoice = {
  id: string;
  direction: InvoiceDirection;
  counterparty: string;
  reference: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
};

export type AgeingBucket = "notDue" | "1to30" | "31to60" | "61to90" | "over90";

export type InvoiceAgeing = {
  invoice: WorkingCapitalInvoice;
  outstanding: number;
  overdueDays: number;
  bucket: AgeingBucket;
};

export type InvoiceSummary = {
  outstanding: number;
  overdue: number;
  dueNext7Days: number;
  dueNext30Days: number;
  count: number;
  buckets: Record<AgeingBucket, number>;
};

export function calculateInvoiceAgeing(
  invoices: WorkingCapitalInvoice[],
  today: string,
): InvoiceAgeing[] {
  const todayDate = new Date(`${today}T12:00:00`);
  return invoices.map((invoice) => {
    const outstanding = Math.max(0, invoice.amount - invoice.paidAmount);
    const dueDate = new Date(`${invoice.dueDate}T12:00:00`);
    const overdueDays = outstanding > 0
      ? Math.max(0, Math.floor((todayDate.getTime() - dueDate.getTime()) / 86400000))
      : 0;
    const bucket: AgeingBucket = overdueDays === 0 ? "notDue"
      : overdueDays <= 30 ? "1to30"
      : overdueDays <= 60 ? "31to60"
      : overdueDays <= 90 ? "61to90" : "over90";
    return { invoice, outstanding, overdueDays, bucket };
  });
}

export function summarizeInvoices(items: InvoiceAgeing[], today: string): InvoiceSummary {
  const now = new Date(`${today}T12:00:00`).getTime();
  const buckets: Record<AgeingBucket, number> = { notDue: 0, "1to30": 0, "31to60": 0, "61to90": 0, over90: 0 };
  let outstanding = 0;
  let overdue = 0;
  let dueNext7Days = 0;
  let dueNext30Days = 0;
  for (const item of items) {
    const amount = item.outstanding;
    outstanding += amount;
    buckets[item.bucket] += amount;
    if (item.overdueDays > 0) overdue += amount;
    const due = new Date(`${item.invoice.dueDate}T12:00:00`).getTime();
    const daysUntilDue = Math.ceil((due - now) / 86400000);
    if (amount > 0 && daysUntilDue >= 0 && daysUntilDue <= 7) dueNext7Days += amount;
    if (amount > 0 && daysUntilDue >= 0 && daysUntilDue <= 30) dueNext30Days += amount;
  }
  return { outstanding, overdue, dueNext7Days, dueNext30Days, count: items.filter((item) => item.outstanding > 0).length, buckets };
}

export function normaliseInvoice(value: WorkingCapitalInvoice): WorkingCapitalInvoice {
  const amount = Number.isFinite(value.amount) ? Math.max(0, value.amount) : 0;
  const paidAmount = Number.isFinite(value.paidAmount) ? Math.min(amount, Math.max(0, value.paidAmount)) : 0;
  return { ...value, counterparty: value.counterparty.trim(), reference: value.reference.trim(), amount, paidAmount };
}
