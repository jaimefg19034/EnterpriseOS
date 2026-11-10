import { isValidISODate, parseISODateUTC } from "./reporting-periods";

export type InvoiceDirection = "receivable" | "payable";

export type InvoicePayment = {
  id: string;
  date: string;
  amount: number;
  note?: string;
};

export type WorkingCapitalInvoice = {
  id: string;
  direction: InvoiceDirection;
  counterparty: string;
  reference: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  /** Dated payments recorded from the point the payment ledger was introduced. */
  payments?: InvoicePayment[];
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
  if (item.payments !== undefined && (!Array.isArray(item.payments) || item.payments.some((payment) => !isValidInvoicePayment(payment)))) {
    return { valid: false, error: "Invoice payment history contains an invalid record." };
  }
  const paymentRows = Array.isArray(item.payments) ? item.payments as InvoicePayment[] : [];
  if (new Set(paymentRows.map((payment) => payment.id.trim())).size !== paymentRows.length) {
    return { valid: false, error: "Invoice payment history contains duplicate payment IDs." };
  }
  const paymentTotal = roundCurrency(paymentRows.reduce((total, payment) => total + roundCurrency(payment.amount), 0));
  if (paymentTotal > roundCurrency(item.paidAmount)) {
    return { valid: false, error: "Recorded payments cannot exceed the invoice paid amount." };
  }
  return { valid: true, invoice: normaliseInvoice(item as unknown as WorkingCapitalInvoice) };
}

export function findDuplicateInvoice(
  candidate: Pick<WorkingCapitalInvoice, "direction" | "counterparty" | "reference">,
  invoices: WorkingCapitalInvoice[],
): WorkingCapitalInvoice | undefined {
  const normalise = (value: string) => value.trim().toLocaleLowerCase();
  return invoices.find((invoice) =>
    invoice.direction === candidate.direction &&
    normalise(invoice.counterparty) === normalise(candidate.counterparty) &&
    normalise(invoice.reference) === normalise(candidate.reference),
  );
}

export type InvoiceCsvParseResult =
  | { ok: true; invoices: WorkingCapitalInvoice[] }
  | { ok: false; error: string };

export function parseInvoiceCsv(raw: string): InvoiceCsvParseResult {
  const source = raw.replace(/^\uFEFF/, "").trim();
  if (!source) return { ok: false, error: "The CSV file is empty." };
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = countCsvDelimiter(firstLine, ";") > countCsvDelimiter(firstLine, ",") ? ";" : ",";
  const rows = parseCsvRows(source, delimiter);
  if (!rows || rows.length < 2) return { ok: false, error: "The CSV file must contain a header and at least one invoice." };
  const normaliseHeader = (value: string) => value.trim().toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const headers = rows[0].map(normaliseHeader);
  const aliases: Record<string, string[]> = {
    direction: ["direction", "tipo", "tipofactura", "tipooperacion"],
    counterparty: ["counterparty", "customersupplier", "customer", "supplier", "cliente", "proveedor", "clienteproveedor"],
    reference: ["reference", "invoicereference", "referencia", "numerofactura", "factura"],
    issueDate: ["issuedate", "issued", "fechaemision", "fechaexpedicion"],
    dueDate: ["duedate", "duedate", "vencimiento", "fechavencimiento"],
    amount: ["amount", "invoiceamount", "importe", "importefactura", "total"],
    paidAmount: ["paidamount", "paid", "importepagado", "pagado", "cobrado"],
  };
  const indexes: Record<string, number> = {};
  for (const [field, names] of Object.entries(aliases)) {
    indexes[field] = headers.findIndex((header) => names.includes(header));
    if (indexes[field] < 0) return { ok: false, error: "Required CSV columns are missing. Use the EnterpriseOS invoice template." };
  }
  const invoices: WorkingCapitalInvoice[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const cells = rows[index];
    if (cells.every((cell) => !cell.trim())) continue;
    if (cells.length !== headers.length) return { ok: false, error: `CSV row ${index + 1} has a different number of columns.` };
    const read = (field: string) => cells[indexes[field]]?.trim() ?? "";
    const directionText = normaliseHeader(read("direction"));
    const direction: InvoiceDirection | null = ["receivable", "receivableinvoice", "cobrar", "cliente", "porcobrar"].includes(directionText)
      ? "receivable"
      : ["payable", "payableinvoice", "pagar", "proveedor", "porpagar"].includes(directionText)
        ? "payable" : null;
    const parseAmount = (value: string) => {
      const cleaned = value.replace(/[€$£\s]/g, "");
      const comma = cleaned.lastIndexOf(",");
      const dot = cleaned.lastIndexOf(".");
      const decimal = comma > dot ? "," : ".";
      const normalised = decimal === ","
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
      return Number(normalised);
    };
    const parseDate = (value: string) => {
      const trimmed = value.trim();
      if (isValidISODate(trimmed)) return trimmed;
      const match = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(trimmed);
      return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : trimmed;
    };
    if (!direction) return { ok: false, error: `CSV row ${index + 1} has an invalid direction. Use receivable/payable or cobrar/pagar.` };
    const candidate: WorkingCapitalInvoice = {
      id: `csv-row-${index + 1}`,
      direction,
      counterparty: read("counterparty"),
      reference: read("reference"),
      issueDate: parseDate(read("issueDate")),
      dueDate: parseDate(read("dueDate")),
      amount: parseAmount(read("amount")),
      paidAmount: parseAmount(read("paidAmount")),
    };
    const validation = validateWorkingCapitalInvoice(candidate);
    if (!validation.valid) return { ok: false, error: `CSV row ${index + 1}: ${validation.error}` };
    if (findDuplicateInvoice(validation.invoice, invoices)) return { ok: false, error: `CSV row ${index + 1} duplicates an invoice earlier in the file.` };
    invoices.push(validation.invoice);
  }
  return invoices.length ? { ok: true, invoices } : { ok: false, error: "No invoice records were found in the CSV file." };
}

function countCsvDelimiter(line: string, delimiter: string): number {
  let quoted = false;
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"' && line[i + 1] === '"') { i += 1; continue; }
    if (line[i] === '"') quoted = !quoted;
    else if (!quoted && line[i] === delimiter) count += 1;
  }
  return count;
}

function parseCsvRows(source: string, delimiter: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === delimiter) { row.push(cell); cell = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (quoted) return null;
  row.push(cell); rows.push(row);
  return rows;
}

function isoDateOrdinal(value: string): number | null {
  const date = parseISODateUTC(value);
  return date ? Math.floor(date.getTime() / 86_400_000) : null;
}

export function calculateInvoiceAgeing(
  invoices: WorkingCapitalInvoice[],
  today: string,
): InvoiceAgeing[] {
  const todayDay = isoDateOrdinal(today);
  return invoices.map((invoice) => {
    const outstanding = Math.max(0, invoice.amount - invoice.paidAmount);
    const dueDay = isoDateOrdinal(invoice.dueDate);
    const overdueDays = outstanding > 0 && todayDay !== null && dueDay !== null
      ? Math.max(0, todayDay - dueDay)
      : 0;
    const bucket: AgeingBucket = overdueDays === 0 ? "notDue"
      : overdueDays <= 30 ? "1to30"
      : overdueDays <= 60 ? "31to60"
      : overdueDays <= 90 ? "61to90" : "over90";
    return { invoice, outstanding, overdueDays, bucket };
  });
}

export function summarizeInvoices(items: InvoiceAgeing[], today: string): InvoiceSummary {
  const todayDay = isoDateOrdinal(today);
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
    const dueDay = isoDateOrdinal(item.invoice.dueDate);
    if (todayDay === null || dueDay === null) continue;
    const daysUntilDue = dueDay - todayDay;
    if (amount > 0 && daysUntilDue >= 0 && daysUntilDue <= 7) dueNext7Days += amount;
    if (amount > 0 && daysUntilDue >= 0 && daysUntilDue <= 30) dueNext30Days += amount;
  }
  return { outstanding: roundCurrency(outstanding), overdue: roundCurrency(overdue), dueNext7Days: roundCurrency(dueNext7Days), dueNext30Days: roundCurrency(dueNext30Days), count: items.filter((item) => item.outstanding > 0).length, buckets: Object.fromEntries(Object.entries(buckets).map(([key, amount]) => [key, roundCurrency(amount)])) as Record<AgeingBucket, number> };
}

export function normaliseInvoice(value: WorkingCapitalInvoice): WorkingCapitalInvoice {
  const amount = roundCurrency(Number.isFinite(value.amount) ? Math.max(0, value.amount) : 0);
  const paidAmount = roundCurrency(Number.isFinite(value.paidAmount) ? Math.min(amount, Math.max(0, value.paidAmount)) : 0);
  const payments = Array.isArray(value.payments) ? value.payments.map((payment) => ({
    id: payment.id.trim(),
    date: payment.date,
    amount: roundCurrency(payment.amount),
    ...(payment.note?.trim() ? { note: payment.note.trim() } : {}),
  })) : [];
  return { ...value, counterparty: value.counterparty.trim(), reference: value.reference.trim(), amount, paidAmount, payments };
}

export type InvoicePaymentResult =
  | { valid: true; invoice: WorkingCapitalInvoice }
  | { valid: false; error: string };

export function addInvoicePayment(
  invoice: WorkingCapitalInvoice,
  payment: InvoicePayment,
): InvoicePaymentResult {
  if (!isValidInvoicePayment(payment)) {
    return { valid: false, error: "Payment date, amount or reference is invalid." };
  }
  if ((invoice.payments ?? []).some((existing) => existing.id.trim() === payment.id.trim())) {
    return { valid: false, error: "This payment has already been recorded." };
  }
  const cleanInvoice = normaliseInvoice(invoice);
  if (payment.date < cleanInvoice.issueDate) {
    return { valid: false, error: "Payment date cannot be before the invoice issue date." };
  }
  const cleanPayment = {
    ...payment,
    id: payment.id.trim(),
    amount: roundCurrency(payment.amount),
    ...(payment.note?.trim() ? { note: payment.note.trim() } : {}),
  };
  const remaining = roundCurrency(cleanInvoice.amount - cleanInvoice.paidAmount);
  if (cleanPayment.amount > remaining) {
    return { valid: false, error: "Payment exceeds the invoice outstanding balance." };
  }
  return {
    valid: true,
    invoice: normaliseInvoice({
      ...cleanInvoice,
      paidAmount: cleanInvoice.paidAmount + cleanPayment.amount,
      payments: [...(cleanInvoice.payments ?? []), cleanPayment],
    }),
  };
}

function isValidInvoicePayment(value: unknown): value is InvoicePayment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payment = value as Record<string, unknown>;
  return typeof payment.id === "string" && payment.id.trim().length > 0 && payment.id.length <= 100 &&
    typeof payment.date === "string" && isValidISODate(payment.date) &&
    typeof payment.amount === "number" && Number.isFinite(payment.amount) && payment.amount > 0 &&
    Math.round((payment.amount + Number.EPSILON) * 100) / 100 > 0 &&
    payment.amount <= 1_000_000_000_000 &&
    (payment.note === undefined || (typeof payment.note === "string" && payment.note.length <= 200));
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
