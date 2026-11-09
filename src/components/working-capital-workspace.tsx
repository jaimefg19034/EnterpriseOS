"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { calculateInvoiceAgeing, normaliseInvoice, summarizeInvoices, type InvoiceDirection, type WorkingCapitalInvoice } from "@/domain/working-capital";
import { downloadExcelWorkbook } from "@/lib/excel-export";
import { translate, type Language } from "@/i18n/translations";

const STORAGE_KEY = "enterpriseos:working-capital:v1";
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
          restored = parsed.filter((item): item is WorkingCapitalInvoice =>
            item && typeof item === "object" &&
            (item.direction === "receivable" || item.direction === "payable") &&
            typeof item.counterparty === "string" && typeof item.reference === "string" &&
            typeof item.issueDate === "string" && typeof item.dueDate === "string" &&
            typeof item.amount === "number" && typeof item.paidAmount === "number" &&
            typeof item.id === "string"
          ).map(normaliseInvoice);
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
  }, [invoices, ready]);

  function addInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const gross = Number(amount);
    const paid = Number(paidAmount);
    if (!counterparty.trim() || !reference.trim() || !issueDate || !dueDate || !Number.isFinite(gross) || gross <= 0 || !Number.isFinite(paid) || paid < 0 || paid > gross) return;
    const invoice: WorkingCapitalInvoice = normaliseInvoice({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `invoice-${Date.now()}`,
      direction, counterparty, reference, issueDate, dueDate, amount: gross, paidAmount: paid,
    });
    setInvoices((current) => [...current, invoice]);
    setCounterparty(""); setReference(""); setAmount(""); setPaidAmount("0");
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
        <button className="secondary-button" type="button" onClick={exportRegister}>{t("Export register")}</button>
      </div>
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
      <p className="working-capital-disclaimer">{t("Records are stored only in this browser. They are not connected to accounting software or the quarterly cash forecast, and are not shared with other users.")}</p>
    </section>
  );
}
