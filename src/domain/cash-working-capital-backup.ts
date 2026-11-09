import type { CashForecastWeekInput } from "./cash-forecast";
import { normaliseInvoice, type WorkingCapitalInvoice } from "./working-capital";

export const LOCAL_FINANCE_BACKUP_VERSION = 1;

export type LocalFinanceBackup = {
  product: "EnterpriseOS";
  schemaVersion: typeof LOCAL_FINANCE_BACKUP_VERSION;
  exportedAt: string;
  workingCapitalInvoices: WorkingCapitalInvoice[];
  quarterlyCashForecast: CashForecastWeekInput[];
};

export type LocalFinanceBackupResult =
  | { ok: true; data: LocalFinanceBackup }
  | { ok: false; error: string };

export function createLocalFinanceBackup(
  invoices: WorkingCapitalInvoice[],
  weeks: CashForecastWeekInput[],
  exportedAt = new Date().toISOString(),
): LocalFinanceBackup {
  return {
    product: "EnterpriseOS",
    schemaVersion: LOCAL_FINANCE_BACKUP_VERSION,
    exportedAt,
    workingCapitalInvoices: invoices.map(normaliseInvoice),
    quarterlyCashForecast: weeks.map(sanitiseWeek),
  };
}

/** Strictly validates a downloaded backup before any browser data is replaced. */
export function parseLocalFinanceBackup(raw: string): LocalFinanceBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }

  if (!isRecord(parsed) || parsed.product !== "EnterpriseOS" || parsed.schemaVersion !== LOCAL_FINANCE_BACKUP_VERSION) {
    return { ok: false, error: "This file is not a supported EnterpriseOS backup." };
  }
  if (!Array.isArray(parsed.workingCapitalInvoices) || !Array.isArray(parsed.quarterlyCashForecast) || parsed.quarterlyCashForecast.length !== 13) {
    return { ok: false, error: "The backup must contain an invoice register and exactly 13 forecast weeks." };
  }
  if (parsed.workingCapitalInvoices.some((item) => !isValidInvoice(item))) {
    return { ok: false, error: "The invoice register contains an invalid record. No data has been changed." };
  }
  if (parsed.quarterlyCashForecast.some((item) => !isValidWeek(item))) {
    return { ok: false, error: "The cash forecast contains an invalid week. No data has been changed." };
  }

  const invoices = parsed.workingCapitalInvoices.map((item) => normaliseInvoice(item as WorkingCapitalInvoice));
  const weeks = parsed.quarterlyCashForecast.map((item) => sanitiseWeek(item as CashForecastWeekInput));
  const ids = new Set<string>();
  for (const invoice of invoices) {
    if (ids.has(invoice.id)) return { ok: false, error: "The backup contains duplicate invoice IDs." };
    ids.add(invoice.id);
  }

  return {
    ok: true,
    data: {
      product: "EnterpriseOS",
      schemaVersion: LOCAL_FINANCE_BACKUP_VERSION,
      exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
      workingCapitalInvoices: invoices,
      quarterlyCashForecast: weeks,
    },
  };
}

function isValidInvoice(value: unknown): value is WorkingCapitalInvoice {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim() ||
      (value.direction !== "receivable" && value.direction !== "payable") ||
      typeof value.counterparty !== "string" || typeof value.reference !== "string" ||
      typeof value.issueDate !== "string" || typeof value.dueDate !== "string" ||
      !isIsoDate(value.issueDate) || !isIsoDate(value.dueDate) || value.dueDate < value.issueDate ||
      typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0 ||
      typeof value.paidAmount !== "number" || !Number.isFinite(value.paidAmount) ||
      value.paidAmount < 0 || value.paidAmount > value.amount) return false;
  return true;
}

function isValidWeek(value: unknown): value is CashForecastWeekInput {
  return isRecord(value) &&
    isValidAmount(value.collections) &&
    isValidAmount(value.operatingPayments) &&
    isValidAmount(value.capitalExpenditure) &&
    isValidAmount(value.debtService);
}

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function sanitiseWeek(value: CashForecastWeekInput): CashForecastWeekInput {
  const clean = (amount: number) => Math.round((Math.max(0, Number.isFinite(amount) ? amount : 0) + Number.EPSILON) * 100) / 100;
  return {
    collections: clean(value.collections),
    operatingPayments: clean(value.operatingPayments),
    capitalExpenditure: clean(value.capitalExpenditure),
    debtService: clean(value.debtService),
  };
}
