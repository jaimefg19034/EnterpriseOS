"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { addInvoicePayment, calculateInvoiceAgeing, findDuplicateInvoice, findFutureDatedInvoicePayments, parseInvoiceCsv, parseStoredWorkingCapitalInvoices, removeFutureInvoicePayment, summarizeInvoices, validateWorkingCapitalInvoice, type InvoiceDirection, type WorkingCapitalInvoice } from "@/domain/working-capital";
import { parseISODateUTC } from "@/domain/reporting-periods";
import { createEmptyCashForecast, parseStoredCashForecast } from "@/domain/cash-forecast";
import { createLocalFinanceBackup, parseLocalFinanceBackup, parseStoredFinanceBackupSections } from "@/domain/cash-working-capital-backup";
import { LEGACY_PLANNING_STORAGE_KEY, PLANNING_STORAGE_KEY } from "@/domain/planning-storage";
import { OPERATIONS_STORAGE_KEY } from "@/domain/operations";
import { downloadExcelWorkbook } from "@/lib/excel-export";
import { translate, type Language } from "@/i18n/translations";

const STORAGE_KEY = "enterpriseos:working-capital:v1";
const CASH_FORECAST_STORAGE_KEY = "enterpriseos:cash-forecast:v1";
const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const excelDate = (value: string) => parseISODateUTC(value) ?? value;
const money = (value: number, language: Language) => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function WorkingCapitalWorkspace({ language }: { language: Language }) {
  const t = (value: string) => translate(value, language);
  const [direction, setDirection] = useState<InvoiceDirection>("receivable");
  const [invoices, setInvoices] = useState<WorkingCapitalInvoice[]>([]);
  const [ready, setReady] = useState(false);
  const [storageWritable, setStorageWritable] = useState(true);
  const [storageWarning, setStorageWarning] = useState("");
  const [savedInvoiceRecoveryData, setSavedInvoiceRecoveryData] = useState<string | null>(null);
  const [counterparty, setCounterparty] = useState("");
  const [reference, setReference] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO);
  const [dueDate, setDueDate] = useState(todayISO);
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [backupMessage, setBackupMessage] = useState("");
  const [invoiceFormError, setInvoiceFormError] = useState("");
  const [csvPreview, setCsvPreview] = useState<WorkingCapitalInvoice[]>([]);
  const [csvImportMessage, setCsvImportMessage] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    const refreshToday = () => setToday(todayISO());
    const interval = window.setInterval(refreshToday, 60_000);
    document.addEventListener("visibilitychange", refreshToday);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshToday);
    };
  }, []);
  const visible = useMemo(() => invoices.filter((item) => item.direction === direction), [invoices, direction]);
  const aged = useMemo(() => calculateInvoiceAgeing(visible, today).sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate)), [visible, today]);
  const summary = useMemo(() => summarizeInvoices(aged, today), [aged, today]);
  const futureDatedPayments = useMemo(() => findFutureDatedInvoicePayments(invoices, today), [invoices, today]);

  useEffect(() => {
    let restored: WorkingCapitalInvoice[] = [];
    let storageError = "";
    let originalSavedData: string | null = null;
    try {
      originalSavedData = window.localStorage.getItem(STORAGE_KEY);
      const result = parseStoredWorkingCapitalInvoices(originalSavedData);
      if (result.ok) restored = result.invoices;
      else storageError = result.error;
    } catch {
      storageError = "Saved invoice data could not be accessed. The original browser data has been preserved.";
    }
    window.setTimeout(() => {
      if (storageError) {
        setStorageWritable(false);
        setStorageWarning(t(storageError));
        setSavedInvoiceRecoveryData(originalSavedData);
      } else {
        setInvoices(restored);
      }
      setReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!ready || !storageWritable) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices)); } catch { /* Optional browser storage. */ }
    window.dispatchEvent(new Event("enterpriseos:working-capital-updated"));
  }, [invoices, ready, storageWritable]);

  function addInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storageWritable) {
      setInvoiceFormError(t("Invoice changes are unavailable until the saved register is recovered or restored from a backup."));
      return;
    }
    const gross = Number(amount);
    const paid = Number(paidAmount);
    const candidate: WorkingCapitalInvoice = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `invoice-${Date.now()}`,
      direction, counterparty, reference, issueDate, dueDate, amount: gross, paidAmount: paid, payments: [],
    };
    const validation = validateWorkingCapitalInvoice(candidate);
    if (!validation.valid) {
      setInvoiceFormError(t(validation.error));
      return;
    }
    const duplicate = findDuplicateInvoice(validation.invoice, invoices);
    if (duplicate) {
      setInvoiceFormError(t("An invoice with this direction, customer or supplier and reference already exists."));
      return;
    }
    setInvoices((current) => [...current, validation.invoice]);
    setInvoiceFormError("");
    setCounterparty(""); setReference(""); setAmount(""); setPaidAmount("0");
  }

  async function prepareCsvImport(event: ChangeEvent<HTMLInputElement>) {
    if (!storageWritable) {
      setCsvImportMessage(t("Invoice changes are unavailable until the saved register is recovered or restored from a backup."));
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvPreview([]);
    setCsvImportMessage("");
    try {
      if (file.size > 2 * 1024 * 1024) {
        setCsvImportMessage(t("CSV file is too large. Maximum size is 2 MB."));
        return;
      }
      const parsed = parseInvoiceCsv(await file.text());
      if (!parsed.ok) {
        setCsvImportMessage(t(parsed.error));
        return;
      }
      for (const invoice of parsed.invoices) {
        if (findDuplicateInvoice(invoice, invoices)) {
          setCsvImportMessage(t("The CSV contains an invoice that already exists in this register. Nothing was imported."));
          return;
        }
      }
      setCsvPreview(parsed.invoices);
      setCsvImportMessage(t("CSV preview ready. Review the records before importing."));
    } catch {
      setCsvImportMessage(t("The CSV file could not be read."));
    } finally {
      event.target.value = "";
    }
  }

  function confirmCsvImport() {
    if (!storageWritable) {
      setCsvImportMessage(t("Invoice changes are unavailable until the saved register is recovered or restored from a backup."));
      return;
    }
    const seen = [...invoices];
    for (const invoice of csvPreview) {
      if (findDuplicateInvoice(invoice, seen)) {
        setCsvImportMessage(t("The CSV contains an invoice that already exists in this register. Nothing was imported."));
        return;
      }
      seen.push(invoice);
    }
    const imported = csvPreview.map((invoice) => ({
      ...invoice,
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `invoice-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    setInvoices((current) => [...current, ...imported]);
    setCsvPreview([]);
    setCsvImportMessage(t("Invoices imported successfully."));
  }

  function removeFuturePayment(invoice: WorkingCapitalInvoice, paymentId: string) {
    if (!storageWritable) return;
    if (!window.confirm(t("Remove this future-dated payment from the paid balance? The invoice will become outstanding again and can be projected using its due date."))) return;
    const result = removeFutureInvoicePayment(invoice, paymentId, todayISO());
    if (!result.valid) {
      setPaymentErrors((current) => ({ ...current, [invoice.id]: t(result.error) }));
      return;
    }
    setInvoices((current) => current.map((item) => item.id === invoice.id ? result.invoice : item));
    setPaymentErrors((current) => ({ ...current, [invoice.id]: "" }));
  }

  function registerPayment(event: FormEvent<HTMLFormElement>, invoice: WorkingCapitalInvoice) {
    event.preventDefault();
    if (!storageWritable) {
      setPaymentErrors((current) => ({ ...current, [invoice.id]: t("Invoice changes are unavailable until the saved register is recovered or restored from a backup.") }));
      return;
    }
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("paymentAmount"));
    const date = String(form.get("paymentDate") ?? "");
    const note = String(form.get("paymentNote") ?? "").trim();
    const payment = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `payment-${invoice.id}-${(invoice.payments?.length ?? 0) + 1}`,
      date,
      amount,
      ...(note ? { note } : {}),
    };
    const result = addInvoicePayment(invoice, payment, todayISO());
    if (!result.valid) {
      setPaymentErrors((current) => ({ ...current, [invoice.id]: t(result.error) }));
      return;
    }
    setInvoices((current) => current.map((item) => item.id === invoice.id ? result.invoice : item));
    setPaymentErrors((current) => ({ ...current, [invoice.id]: "" }));
    event.currentTarget.reset();
  }

  async function exportRegister() {
    if (!storageWritable) {
      setBackupMessage(t("The saved invoice register is invalid or unavailable. Export was blocked to avoid presenting incomplete data."));
      return;
    }
    await downloadExcelWorkbook({
      filename: `enterpriseos-${direction === "receivable" ? "receivables" : "payables"}-aging.xlsx`,
      sheets: [
        {
          name: t(direction === "receivable" ? "Receivables" : "Payables"),
          title: `EnterpriseOS — ${t(direction === "receivable" ? "Receivables" : "Payables")}`,
          subtitle: t("Open invoice register · EUR · User-entered records"),
          headers: [t("Counterparty"), t("Invoice reference"), t("Issue date"), t("Due date"), t("Invoice amount"), t("Paid amount"), t("Outstanding"), t("Ageing bucket")],
          widths: [26, 20, 16, 16, 18, 18, 18, 18],
          dateColumns: [3, 4],
          currencyColumns: [5, 6, 7],
          totalLabels: [t("TOTAL")],
          rows: [
            ...aged.map((row) => [row.invoice.counterparty, row.invoice.reference, excelDate(row.invoice.issueDate), excelDate(row.invoice.dueDate), row.invoice.amount, row.invoice.paidAmount, row.outstanding, t(row.bucket)]),
            [t("TOTAL"), "", "", "", aged.reduce((total, row) => total + row.invoice.amount, 0), aged.reduce((total, row) => total + row.invoice.paidAmount, 0), summary.outstanding, ""],
          ],
        },
        {
          name: t("Payment movements"),
          title: `EnterpriseOS — ${t("Payment movements")}`,
          subtitle: t("Invoice payment movements · User-entered records"),
          headers: [t("Movement date"), t("Movement type"), t("Counterparty"), t("Invoice reference"), t("Payment amount"), t("Payment note")],
          widths: [18, 30, 26, 20, 20, 40],
          dateColumns: [1],
          currencyColumns: [5],
          totalLabels: [t("Total paid amount")],
          rows: [
            ...aged.flatMap(({ invoice }) => {
            const recorded = invoice.payments ?? [];
            const recordedTotal = recorded.reduce((total, payment) => total + payment.amount, 0);
            const legacyBalance = Math.max(0, Math.round((invoice.paidAmount - recordedTotal + Number.EPSILON) * 100) / 100);
            return [
              ...recorded.map((payment) => [excelDate(payment.date), t("Payment"), invoice.counterparty, invoice.reference, payment.amount, payment.note ?? ""]),
              ...(legacyBalance > 0 ? [[
                "—",
                t("Historical paid balance (undated)"),
                invoice.counterparty,
                invoice.reference,
                legacyBalance,
                t("Legacy paid balance without transaction date"),
              ]] : []),
            ];
            }),
            [t("Total paid amount"), "", "", "", aged.reduce((total, row) => total + row.invoice.paidAmount, 0), t("Includes dated and undated paid balances")],
          ],
        },
        {
          name: t("Ageing summary"),
          title: `EnterpriseOS — ${t("Ageing summary")}`,
          subtitle: t("Open invoice balances by ageing bucket · EUR · User-entered records"),
          headers: [t("Metric"), t("Balance")],
          widths: [36, 22],
          currencyColumns: [2],
          totalLabels: [t("Outstanding")],
          rows: [
            [t("Outstanding"), summary.outstanding],
            [t("Overdue"), summary.overdue],
            [t("Due in 7 days"), summary.dueNext7Days],
            [t("Due in 30 days"), summary.dueNext30Days],
            [t("Not due"), summary.buckets.notDue],
            [t("1–30 days"), summary.buckets["1to30"]],
            [t("31–60 days"), summary.buckets["31to60"]],
            [t("61–90 days"), summary.buckets["61to90"]],
            [t("90+ days"), summary.buckets.over90],
          ],
        },
      ],
    });
  }

  function readCashForecastForBackup() {
    try {
      const raw = window.localStorage.getItem(CASH_FORECAST_STORAGE_KEY);
      const result = parseStoredCashForecast(raw);
      if (!result.ok) {
        setBackupMessage(t("The saved cash forecast is invalid. The backup was not created to protect your data."));
        return null;
      }
      return result.weeks;
    } catch {
      setBackupMessage(t("Browser storage could not be read. Check storage permissions and try again."));
      return null;
    }
  }

  function downloadOriginalInvoiceData() {
    if (savedInvoiceRecoveryData === null) return;
    const blob = new Blob([savedInvoiceRecoveryData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `enterpriseos-invoice-recovery-${today}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMessage(t("A copy of the original saved invoice data has been downloaded. Keep it safe before attempting recovery."));
  }

  function downloadLocalBackup() {
    if (!storageWritable) {
      setBackupMessage(t("The saved invoice register is invalid or unavailable. The backup was not created to protect your data."));
      return;
    }
    let rawPlanning: string | null;
    let legacyPlanning: string | null;
    let rawOperations: string | null;
    try {
      rawPlanning = window.localStorage.getItem(PLANNING_STORAGE_KEY);
      legacyPlanning = rawPlanning === null ? window.localStorage.getItem(LEGACY_PLANNING_STORAGE_KEY) : null;
      rawOperations = window.localStorage.getItem(OPERATIONS_STORAGE_KEY);
    } catch {
      setBackupMessage(t("Browser storage could not be read. Check storage permissions and try again."));
      return;
    }
    const sections = parseStoredFinanceBackupSections(rawPlanning, legacyPlanning, rawOperations);
    if (!sections.ok) {
      setBackupMessage(t(sections.error));
      return;
    }
    const { planningState: planning, operationsState: operations } = sections;
    const forecast = readCashForecastForBackup();
    if (!forecast) return;
    const backup = createLocalFinanceBackup(invoices, forecast, undefined, planning, operations);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `enterpriseos-finance-backup-${today}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMessage(t("A local backup file has been prepared. Store it somewhere private and secure."));
  }

  async function restoreLocalBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    let rollbackFailed = false;
    try {
      if (file.size > 5 * 1024 * 1024) {
        setBackupMessage(t("The backup file is too large. Maximum size is 5 MB."));
        return;
      }
      const result = parseLocalFinanceBackup(await file.text());
      if (!result.ok) {
        setBackupMessage(t(result.error));
        return;
      }
      if (!window.confirm(t("Restoring this backup replaces the finance and operations data included in the file in this browser. Continue?"))) return;
      const previousInvoices = window.localStorage.getItem(STORAGE_KEY);
      const previousForecast = window.localStorage.getItem(CASH_FORECAST_STORAGE_KEY);
      const previousPlanning = window.localStorage.getItem(PLANNING_STORAGE_KEY);
      const previousOperations = window.localStorage.getItem(OPERATIONS_STORAGE_KEY);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data.workingCapitalInvoices));
        window.localStorage.setItem(CASH_FORECAST_STORAGE_KEY, JSON.stringify(result.data.quarterlyCashForecast));
        if (result.data.planningState) window.localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(result.data.planningState));
        if (result.data.operationsState) window.localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(result.data.operationsState));
      } catch (storageError) {
        try {
          if (previousInvoices === null) window.localStorage.removeItem(STORAGE_KEY);
          else window.localStorage.setItem(STORAGE_KEY, previousInvoices);
          if (previousForecast === null) window.localStorage.removeItem(CASH_FORECAST_STORAGE_KEY);
          else window.localStorage.setItem(CASH_FORECAST_STORAGE_KEY, previousForecast);
          if (previousPlanning === null) window.localStorage.removeItem(PLANNING_STORAGE_KEY);
          else window.localStorage.setItem(PLANNING_STORAGE_KEY, previousPlanning);
          if (previousOperations === null) window.localStorage.removeItem(OPERATIONS_STORAGE_KEY);
          else window.localStorage.setItem(OPERATIONS_STORAGE_KEY, previousOperations);
        } catch {
          rollbackFailed = true;
        }
        throw storageError;
      }
      setInvoices(result.data.workingCapitalInvoices);
      setStorageWritable(true);
      setStorageWarning("");
      setSavedInvoiceRecoveryData(null);
      window.dispatchEvent(new Event("enterpriseos:working-capital-updated"));
      window.dispatchEvent(new Event("enterpriseos:cash-forecast-updated"));
      if (result.data.planningState) window.dispatchEvent(new Event("enterpriseos:planning-updated"));
      if (result.data.operationsState) window.dispatchEvent(new Event("enterpriseos:operations-updated"));
      setBackupMessage(t("Backup restored successfully. Your current browser data has been replaced."));
    } catch {
      setBackupMessage(t(rollbackFailed
        ? "The restore failed and the previous data could not be fully recovered. Some browser data may have changed. Reload the page and download any recoverable data before continuing."
        : "The backup could not be restored. No data has been changed."));
    } finally {
      event.target.value = "";
    }
  }

  const buckets = [
    ["notDue", "Not due"],
    ["1to30", "1–30 days"],
    ["31to60", "31–60 days"],
    ["61to90", "61–90 days"],
    ["over90", "90+ days"],
  ] as const;

  return (
    <section className="working-capital-workspace" aria-labelledby="working-capital-title">
      <div className="working-capital-heading">
        <div><span className="panel-kicker">{t("WORKING CAPITAL")}</span><h2 id="working-capital-title">{t("Receivables & payables")}</h2><p>{t("Track invoice balances, overdue exposure and upcoming cash commitments.")}</p></div>
        <div className="working-capital-actions">
          <button className="secondary-button" type="button" onClick={() => csvInputRef.current?.click()}>{t("Import CSV")}</button>
          <input ref={csvInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={prepareCsvImport} />
          <button className="secondary-button" type="button" onClick={exportRegister}>{t("Export register")}</button>
          {savedInvoiceRecoveryData !== null && <button className="secondary-button" type="button" onClick={downloadOriginalInvoiceData}>{t("Download original invoice data")}</button>}
          <button className="secondary-button" type="button" onClick={downloadLocalBackup}>{t("Download data backup")}</button>
          <button className="secondary-button" type="button" onClick={() => backupInputRef.current?.click()}>{t("Restore backup")}</button>
          <input ref={backupInputRef} className="sr-only" type="file" accept=".json,application/json" onChange={restoreLocalBackup} />
        </div>
      </div>
      {storageWarning && <p className="working-capital-backup-message" role="alert">{storageWarning}</p>}
      {futureDatedPayments.length > 0 && <div className="working-capital-backup-message" role="alert">
        <strong>{t("Review future-dated payments")}</strong>
        <p>{t("Some saved payment movements are dated after today. They were recorded as paid before this date and may understate the outstanding invoice balance.")} {futureDatedPayments.length} {t("future-dated payment records found.")}</p>
        <p>{t("Review each highlighted movement below. Remove it only if it was entered as a planned payment rather than money already received or paid.")}</p>
      </div>}
      {backupMessage && <p className="working-capital-backup-message" role="status">{backupMessage}</p>}
      {csvImportMessage && <div className="working-capital-import-message" role="status">{csvImportMessage}</div>}
      {csvPreview.length > 0 && <div className="working-capital-import-preview panel">
        <div className="working-capital-subhead"><h3>{t("CSV import preview")}</h3><span>{csvPreview.length} {t("records ready")}</span></div>
        <div className="working-capital-table-scroll"><table><thead><tr><th>{t("Type")}</th><th>{t("Counterparty")}</th><th>{t("Reference")}</th><th>{t("Due date")}</th><th>{t("Amount")}</th></tr></thead><tbody>
          {csvPreview.slice(0, 8).map((invoice) => <tr key={invoice.id}><td>{t(invoice.direction === "receivable" ? "Receivable" : "Payable")}</td><td>{invoice.counterparty}</td><td>{invoice.reference}</td><td>{invoice.dueDate}</td><td>{money(invoice.amount, language)}</td></tr>)}
        </tbody></table></div>
        {csvPreview.length > 8 && <p>{t("Showing the first 8 records. All records will be imported.")}</p>}
        <div className="working-capital-form-footer"><button className="secondary-button" type="button" onClick={() => { setCsvPreview([]); setCsvImportMessage(t("CSV import cancelled.")); }}>{t("Cancel")}</button><button className="primary-button" type="button" onClick={confirmCsvImport}>{t("Confirm import")}</button></div>
      </div>}
      <div className="working-capital-tabs" role="tablist" aria-label={t("Invoice type")}>
        <button type="button" role="tab" aria-selected={direction === "receivable"} className={direction === "receivable" ? "active" : ""} onClick={() => setDirection("receivable")}>{t("Receivables")}</button>
        <button type="button" role="tab" aria-selected={direction === "payable"} className={direction === "payable" ? "active" : ""} onClick={() => setDirection("payable")}>{t("Payables")}</button>
      </div>
      <div className="working-capital-kpis">
        <article className="panel"><span>{t("Outstanding")}</span><strong>{money(summary.outstanding, language)}</strong><small>{summary.count} {t("open invoices")}</small></article>
        <article className="panel"><span>{t("Overdue")}</span><strong className={summary.overdue > 0 ? "negative" : ""}>{money(summary.overdue, language)}</strong><small>{t("Past due date")}</small></article>
        <article className="panel"><span>{t("Due in 7 days")}</span><strong>{money(summary.dueNext7Days, language)}</strong><small>{t("Upcoming cash movement")}</small></article>
        <article className="panel"><span>{t("Due in 30 days")}</span><strong>{money(summary.dueNext30Days, language)}</strong><small>{t("Upcoming cash movement")}</small></article>
      </div>
      <div className="working-capital-ageing panel">
        <div className="working-capital-subhead"><h3>{t("Ageing analysis")}</h3><span>{t("Outstanding balance by due date")}</span></div>
        <div className="working-capital-buckets">{buckets.map(([key, label]) => <div key={key}><span>{t(label)}</span><strong>{money(summary.buckets[key], language)}</strong><i><b style={{ width: `${summary.outstanding > 0 ? summary.buckets[key] / summary.outstanding * 100 : 0}%` }} /></i></div>)}</div>
      </div>
      {invoiceFormError && <p className="working-capital-backup-message" role="alert">{invoiceFormError}</p>}
      <form className="working-capital-form panel" onSubmit={addInvoice}>
        <div className="working-capital-subhead"><h3>{t("Add invoice")}</h3><span>{t("Manual entry · No sample invoices")}</span></div>
        <div className="working-capital-form-grid">
          <label><span>{t("Customer / supplier")}</span><input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} required maxLength={100} /></label>
          <label><span>{t("Invoice reference")}</span><input value={reference} onChange={(e) => setReference(e.target.value)} required maxLength={60} /></label>
          <label><span>{t("Issue date")}</span><input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required /></label>
          <label><span>{t("Due date")}</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={issueDate} required /></label>
          <label><span>{t("Invoice amount")}</span><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
          <label><span>{t("Paid amount")}</span><input type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} required /></label>
        </div>
        <div className="working-capital-form-footer"><small>{t("Outstanding balance is calculated as invoice amount minus paid amount.")}</small><button className="primary-button" type="submit">{t("Add invoice")}</button></div>
      </form>
      <div className="working-capital-register panel">
        <div className="working-capital-subhead"><h3>{t("Invoice register")}</h3><span>{aged.length} {t("records")}</span></div>
        {aged.length === 0 ? <div className="working-capital-empty">{t("No invoices yet. Add your first record above; the register starts empty to avoid invented financial data.")}</div> : (
          <div className="working-capital-table-scroll"><table><thead><tr><th>{t("Counterparty")}</th><th>{t("Reference")}</th><th>{t("Due date")}</th><th>{t("Amount")}</th><th>{t("Paid")}</th><th>{t("Outstanding")}</th><th>{t("Ageing")}</th><th /><th>{t("Payment history")}</th></tr></thead><tbody>
            {aged.map((row) => <tr key={row.invoice.id}><td>{row.invoice.counterparty}</td><td>{row.invoice.reference}</td><td>{row.invoice.dueDate}</td><td>{money(row.invoice.amount, language)}</td><td>{money(row.invoice.paidAmount, language)}</td><td className="working-capital-outstanding">{money(row.outstanding, language)}</td><td><span className={row.overdueDays > 0 ? "working-capital-overdue" : "working-capital-current"}>{t(buckets.find(([key]) => key === row.bucket)?.[1] ?? "Not due")}</span></td><td><button type="button" className="working-capital-delete" aria-label={t("Delete invoice")} onClick={() => setInvoices((current) => current.filter((item) => item.id !== row.invoice.id))}>×</button></td><td><details><summary>{t("Payments")} ({row.invoice.payments?.length ?? 0})</summary><div className="working-capital-payment-history"><p>{t("Recorded payments")}: {money((row.invoice.payments ?? []).reduce((total, payment) => total + payment.amount, 0), language)}</p><small>{t("Historical paid balances entered before payment tracking have no individual dates and are not included in this movement list.")}</small>{(row.invoice.payments ?? []).map((payment) => <div className="working-capital-payment-row" key={payment.id}><p>{payment.date} · {money(payment.amount, language)}{payment.note ? ` · ${payment.note}` : ""}</p>{payment.date > today && <button type="button" className="secondary-button" onClick={() => removeFuturePayment(row.invoice, payment.id)}>{t("Remove future-dated payment")}</button>}</div>)}{row.outstanding > 0 && <form onSubmit={(event) => registerPayment(event, row.invoice)}><label><span>{t("Payment date")}</span><input name="paymentDate" type="date" defaultValue={today} max={today} required /></label><label><span>{t("Payment amount")}</span><input name="paymentAmount" type="number" min="0.01" max={row.outstanding} step="0.01" required /></label><label><span>{t("Note (optional)")}</span><input name="paymentNote" maxLength={200} /></label><button type="submit" className="secondary-button">{t("Register payment")}</button></form>}{paymentErrors[row.invoice.id] && <p role="alert">{paymentErrors[row.invoice.id]}</p>}</div></details></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      <p className="working-capital-disclaimer">{t("Records are stored only in this browser and are not connected to accounting software. You can preview open invoice balances in the quarterly cash forecast and choose whether to include them; no invoice is marked as paid automatically.")}</p>
    </section>
  );
}
