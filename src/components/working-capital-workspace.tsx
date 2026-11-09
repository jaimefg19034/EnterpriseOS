"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { calculateInvoiceAgeing, findDuplicateInvoice, normaliseInvoice, parseInvoiceCsv, summarizeInvoices, validateWorkingCapitalInvoice, type InvoiceDirection, type WorkingCapitalInvoice } from "@/domain/working-capital";
import { createEmptyCashForecast } from "@/domain/cash-forecast";
import { createLocalFinanceBackup, parseLocalFinanceBackup } from "@/domain/cash-working-capital-backup";
import { parseSavedPlanningState, PLANNING_STORAGE_KEY } from "@/domain/planning-storage";
import { OPERATIONS_STORAGE_KEY, parseOperationsState } from "@/domain/operations";
import { downloadExcelWorkbook } from "@/lib/excel-export";
import { translate, type Language } from "@/i18n/translations";

const STORAGE_KEY = "enterpriseos:working-capital:v1";
const CASH_FORECAST_STORAGE_KEY = "enterpriseos:cash-forecast:v1";
const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const money = (value: number, language: Language) => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function WorkingCapitalWorkspace({ language }: { language: Language }) {
  const t = (value: string) => translate(value, language);
  const [direction, setDirection] = useState<InvoiceDirection>("receivable");
  const [invoices, setInvoices] = useState<WorkingCapitalInvoice[]>([]);
  const [ready, setReady] = useState(false);
  const [counterparty, setCounterparty] = useState("");
  const [reference, setReference] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO);
  const [dueDate, setDueDate] = useState(todayISO);
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [backupMessage, setBackupMessage] = useState("");
  const [invoiceFormError, setInvoiceFormError] = useState("");
  const [csvPreview, setCsvPreview] = useState<WorkingCapitalInvoice[]>([]);
  const [csvImportMessage, setCsvImportMessage] = useState("");
  const csvInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const today = useMemo(() => todayISO(), []);
  const visible = useMemo(() => invoices.filter((item) => item.direction === direction), [invoices, direction]);
  const aged = useMemo(() => calculateInvoiceAgeing(visible, today).sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate)), [visible, today]);
  const summary = useMemo(() => summarizeInvoices(aged, today), [aged, today]);

  useEffect(() => {
    let restored: WorkingCapitalInvoice[] | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          restored = parsed
            .map((item) => validateWorkingCapitalInvoice(item))
            .filter((result) => result.valid)
            .map((result) => result.invoice);
        }
      }
    } catch {
      // Local persistence is optional; the register remains usable for this session.
    }
    window.setTimeout(() => {
      if (restored) setInvoices(restored);
      setReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices)); } catch { /* Optional browser storage. */ }
    window.dispatchEvent(new Event("enterpriseos:working-capital-updated"));
  }, [invoices, ready]);

  function addInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const gross = Number(amount);
    const paid = Number(paidAmount);
    const candidate: WorkingCapitalInvoice = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `invoice-${Date.now()}`,
      direction, counterparty, reference, issueDate, dueDate, amount: gross, paidAmount: paid,
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

  function updatePaid(id: string, raw: string) {
    const parsed = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(parsed)) return;
    setInvoices((current) => current.map((item) => item.id === id ? normaliseInvoice({ ...item, paidAmount: parsed }) : item));
  }

  async function exportRegister() {
    await downloadExcelWorkbook({
      filename: `enterpriseos-${direction === "receivable" ? "receivables" : "payables"}-aging.xlsx`,
      sheets: [{
        name: t(direction === "receivable" ? "Receivables" : "Payables"),
        title: `EnterpriseOS — ${t(direction === "receivable" ? "Receivables" : "Payables")}`,
        subtitle: t("Open invoice register · EUR · User-entered records"),
        headers: [t("Counterparty"), t("Invoice reference"), t("Issue date"), t("Due date"), t("Invoice amount"), t("Paid amount"), t("Outstanding"), t("Ageing bucket")],
        widths: [26, 20, 16, 16, 18, 18, 18, 18],
        currencyColumns: [5, 6, 7],
        rows: aged.map((row) => [row.invoice.counterparty, row.invoice.reference, row.invoice.issueDate, row.invoice.dueDate, row.invoice.amount, row.invoice.paidAmount, row.outstanding, t(row.bucket)]),
      }],
    });
  }

  function readCashForecastForBackup() {
    try {
      const raw = window.localStorage.getItem(CASH_FORECAST_STORAGE_KEY);
      if (!raw) return createEmptyCashForecast(13);
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length !== 13) return createEmptyCashForecast(13);
      return parsed.map((item) => {
        const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
        const amount = (key: "collections" | "operatingPayments" | "capitalExpenditure" | "debtService") => {
          const value = record[key];
          return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
        };
        return {
          collections: amount("collections"),
          operatingPayments: amount("operatingPayments"),
          capitalExpenditure: amount("capitalExpenditure"),
          debtService: amount("debtService"),
        };
      });
    } catch {
      return createEmptyCashForecast(13);
    }
  }

  function downloadLocalBackup() {
    let planning = null;
    let operations = null;
    try {
      const rawPlanning = window.localStorage.getItem(PLANNING_STORAGE_KEY);
      planning = rawPlanning ? parseSavedPlanningState(rawPlanning) : null;
      const rawOperations = window.localStorage.getItem(OPERATIONS_STORAGE_KEY);
      operations = rawOperations ? parseOperationsState(rawOperations) : null;
    } catch {
      setBackupMessage(t("Browser storage could not be read. Check storage permissions and try again."));
      return;
    }
    const backup = createLocalFinanceBackup(invoices, readCashForecastForBackup(), undefined, planning, operations);
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
          // Best-effort rollback if the browser blocks all storage writes.
        }
        throw storageError;
      }
      setInvoices(result.data.workingCapitalInvoices);
      window.dispatchEvent(new Event("enterpriseos:working-capital-updated"));
      window.dispatchEvent(new Event("enterpriseos:cash-forecast-updated"));
      if (result.data.planningState) window.dispatchEvent(new Event("enterpriseos:planning-updated"));
      if (result.data.operationsState) window.dispatchEvent(new Event("enterpriseos:operations-updated"));
      setBackupMessage(t("Backup restored successfully. Your current browser data has been replaced."));
    } catch {
      setBackupMessage(t("The backup could not be restored. No data has been changed."));
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
          <button className="secondary-button" type="button" onClick={downloadLocalBackup}>{t("Download data backup")}</button>
          <button className="secondary-button" type="button" onClick={() => backupInputRef.current?.click()}>{t("Restore backup")}</button>
          <input ref={backupInputRef} className="sr-only" type="file" accept=".json,application/json" onChange={restoreLocalBackup} />
        </div>
      </div>
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
          <div className="working-capital-table-scroll"><table><thead><tr><th>{t("Counterparty")}</th><th>{t("Reference")}</th><th>{t("Due date")}</th><th>{t("Amount")}</th><th>{t("Paid")}</th><th>{t("Outstanding")}</th><th>{t("Ageing")}</th><th /></tr></thead><tbody>
            {aged.map((row) => <tr key={row.invoice.id}><td>{row.invoice.counterparty}</td><td>{row.invoice.reference}</td><td>{row.invoice.dueDate}</td><td>{money(row.invoice.amount, language)}</td><td><input aria-label={t("Paid amount")} type="number" min="0" max={row.invoice.amount} step="0.01" value={row.invoice.paidAmount} onChange={(e) => updatePaid(row.invoice.id, e.target.value)} /></td><td className="working-capital-outstanding">{money(row.outstanding, language)}</td><td><span className={row.overdueDays > 0 ? "working-capital-overdue" : "working-capital-current"}>{t(buckets.find(([key]) => key === row.bucket)?.[1] ?? "Not due")}</span></td><td><button type="button" className="working-capital-delete" aria-label={t("Delete invoice")} onClick={() => setInvoices((current) => current.filter((item) => item.id !== row.invoice.id))}>×</button></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      <p className="working-capital-disclaimer">{t("Records are stored only in this browser and are not connected to accounting software. You can preview open invoice balances in the quarterly cash forecast and choose whether to include them; no invoice is marked as paid automatically.")}</p>
    </section>
  );
}
