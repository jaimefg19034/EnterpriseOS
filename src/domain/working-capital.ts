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

export type InvoiceValidationResult =
  | { valid: true; invoice: WorkingCapitalInvoice }
  | { valid: false; error: string };

export function validateWorkingCapitalInvoice(value: unknown): InvoiceValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, error: "Invoice record must be an object." };
  }
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id.trim() || item.id.length > 100) {
    return { valid: false, error: "Invoice ID is missing or invalid." };
  }
  if (item.direction !== "receivable" && item.direction !== "payable") {
    return { valid: false, error: "Invoice direction is invalid." };
  }
  if (typeof item.counterparty !== "string" || !item.counterparty.trim() || item.counterparty.trim().length > 100) {
    return { valid: false, error: "Customer or supplier name is missing or too long." };
  }
  if (typeof item.reference !== "string" || !item.reference.trim() || item.reference.trim().length > 60) {
    return { valid: false, error: "Invoice reference is missing or too long." };
  }
  if (typeof item.issueDate !== "string" || typeof item.dueDate !== "string" ||
      !isValidISODate(item.issueDate) || !isValidISODate(item.dueDate) || item.dueDate < item.issueDate) {
    return { valid: false, error: "Invoice dates are invalid or the due date is before the issue date." };
  }
  if (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1_000_000_000_000) {
    return { valid: false, error: "Invoice amount must be positive and within the supported limit." };
  }
  if (typeof item.paidAmount !== "number" || !Number.isFinite(item.paidAmount) || item.paidAmount < 0 || item.paidAmount > item.amount) {
    return { valid: false, error: "Paid amount must be between zero and the invoice amount." };
  }
  return { valid: true, invoice: normaliseInvoice(item as unknown as WorkingCapitalInvoice) };
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function calculateInvoiceAgeing(
  invoices: WorkingCapitalInvoice[],
  today: string,
): InvoiceAgeing[] {
  const todayDate = new Date(`${today}T12:00:00`);
  return invoices.map((invoice) => {
    const outstanding = Math.max(0, invoice.amount - invoice.paidAmount);
    const dueDate = new Date(`${invoice.dueDate}T12:00:00`);
    const overdueDays = outstanding > 0 && isValidISODate(today) && isValidISODate(invoice.dueDate)
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
  const now = isValidISODate(today) ? new Date(`${today}T12:00:00`).getTime() : 0;
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
    if (!isValidISODate(today) || !isValidISODate(item.invoice.dueDate)) continue;
    const due = new Date(`${item.invoice.dueDate}T12:00:00`).getTime();
    const daysUntilDue = Math.ceil((due - now) / 86400000);
    if (amount > 0 && daysUntilDue >= 0 && daysUntilDue <= 7) dueNext7Days += amount;
    if (amount > 0 && daysUntilDue >= 0 && daysUntilDue <= 30) dueNext30Days += amount;
  }
  return { outstanding: roundCurrency(outstanding), overdue: roundCurrency(overdue), dueNext7Days: roundCurrency(dueNext7Days), dueNext30Days: roundCurrency(dueNext30Days), count: items.filter((item) => item.outstanding > 0).length, buckets: Object.fromEntries(Object.entries(buckets).map(([key, amount]) => [key, roundCurrency(amount)])) as Record<AgeingBucket, number> };
}

export function normaliseInvoice(value: WorkingCapitalInvoice): WorkingCapitalInvoice {
  const amount = roundCurrency(Number.isFinite(value.amount) ? Math.max(0, value.amount) : 0);
  const paidAmount = roundCurrency(Number.isFinite(value.paidAmount) ? Math.min(amount, Math.max(0, value.paidAmount)) : 0);
  return { ...value, counterparty: value.counterparty.trim(), reference: value.reference.trim(), amount, paidAmount };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
