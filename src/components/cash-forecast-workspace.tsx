"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateCashForecast,
  calculateCashStressScenario,
  createEmptyCashForecast,
  parseStoredCashForecast,
  type CashForecastWeekInput,
} from "@/domain/cash-forecast";
import { downloadExcelWorkbook } from "@/lib/excel-export";
import { allocateInvoicesToCashWeeks } from "@/domain/invoice-cash-integration";
import { findFutureDatedInvoicePayments, parseStoredWorkingCapitalInvoices, type WorkingCapitalInvoice } from "@/domain/working-capital";
import { translate, type Language } from "@/i18n/translations";

type CashForecastWorkspaceProps = {
  openingCash: number;
  language: Language;
};

const STORAGE_KEY = "enterpriseos:cash-forecast:v1";
const INVOICE_STORAGE_KEY = "enterpriseos:working-capital:v1";
const INVOICE_UPDATED_EVENT = "enterpriseos:working-capital-updated";

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readStoredInvoices() {
  try {
    return parseStoredWorkingCapitalInvoices(window.localStorage.getItem(INVOICE_STORAGE_KEY));
  } catch {
    return { ok: false as const, error: "Saved invoice data could not be accessed. The original browser data has been preserved." };
  }
}

const FIELDS: { key: keyof CashForecastWeekInput; label: string; short: string }[] = [
  { key: "collections", label: "Customer collections", short: "Collections" },
  { key: "operatingPayments", label: "Operating payments", short: "Operating payments" },
  { key: "capitalExpenditure", label: "Capital expenditure", short: "CapEx" },
  { key: "debtService", label: "Debt service", short: "Debt service" },
];

function formatMoney(value: number, language: Language) {
  return new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(value);
}

function mondayOf(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
}

function excelDateOnly(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function CashBalanceChart({ values, openingCash, language, stressValues }: {
  values: number[];
  openingCash: number;
  language: Language;
  stressValues?: number[];
}) {
  const all = [openingCash, ...values, ...(stressValues ?? [])];
  const min = Math.min(0, ...all);
  const max = Math.max(1, ...all);
  const range = Math.max(1, max - min);
  const x = (index: number) => 24 + (index / Math.max(1, values.length)) * 672;
  const y = (value: number) => 145 - ((value - min) / range) * 118;
  const points = [openingCash, ...values].map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const stressPoints = stressValues ? [openingCash, ...stressValues].map((value, index) => `${x(index)},${y(value)}`).join(" ") : "";
  const zeroY = y(0);
  return (
    <section className="panel cash-forecast-chart-card">
      <div className="cash-forecast-chart-head">
        <div><h3>{translate("Projected cash balance", language)}</h3><p>{translate("Opening cash plus the cumulative weekly net movements.", language)}</p></div>
        <strong>{formatMoney(values.at(-1) ?? openingCash, language)}</strong>
      </div>
      <svg className="cash-forecast-svg" viewBox="0 0 720 180" role="img" aria-label={translate("Quarterly projected cash balance chart", language)}>
        <line x1="24" y1={zeroY} x2="696" y2={zeroY} stroke="#dce3ee" strokeDasharray="4 5" />
        {[0, 1, 2, 3].map((tick) => {
          const value = min + (range * tick) / 3;
          const yy = y(value);
          return <g key={tick}><line x1="24" y1={yy} x2="696" y2={yy} stroke="#edf1f6" /><text x="20" y={yy - 5} textAnchor="end" fill="#8995a7" fontSize="9">{Math.round(value / 1000)}k</text></g>;
        })}
        <polyline points={points} fill="none" stroke="#5872c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {stressValues && <polyline points={stressPoints} fill="none" stroke="#d28b45" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />}
        {[openingCash, ...values].map((value, index) => <circle key={`base-${index}`} cx={x(index)} cy={y(value)} r={index === values.length ? 4.5 : 2.7} fill={value < 0 ? "#c96e70" : "#5872c7"} />)}\n        {stressValues && [openingCash, ...stressValues].slice(1).map((value, index) => <circle key={`stress-${index}`} cx={x(index + 1)} cy={y(value)} r="2.4" fill={value < 0 ? "#c96e70" : "#d28b45"} />)}
        <text x="24" y="169" fill="#7c899c" fontSize="9">{translate("Opening", language)}</text>
        <text x="696" y="169" textAnchor="end" fill="#7c899c" fontSize="9">{translate("Week 13", language)}</text>
      </svg>
      {values.some((value) => value < 0) && <p className="cash-forecast-warning">{translate("The forecast indicates a negative cash balance. Review collections, payments or financing before the affected week.", language)}</p>}
    </section>
  );
}

export function CashForecastWorkspace({ openingCash, language }: CashForecastWorkspaceProps) {
  const t = (value: string) => translate(value, language);
  const [weeks, setWeeks] = useState<CashForecastWeekInput[]>(() => createEmptyCashForecast(13));
  const [storageReady, setStorageReady] = useState(false);
  const [forecastStorageWritable, setForecastStorageWritable] = useState(false);
  const [forecastStorageError, setForecastStorageError] = useState("");
  const [forecastRecoveryData, setForecastRecoveryData] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<WorkingCapitalInvoice[]>([]);
  const [invoiceStorageError, setInvoiceStorageError] = useState("");
  const [invoiceRecoveryData, setInvoiceRecoveryData] = useState<string | null>(null);
  const [includeInvoices, setIncludeInvoices] = useState(false);
  const [collectionReduction, setCollectionReduction] = useState(15);
  const [paymentIncrease, setPaymentIncrease] = useState(10);
  const [asOfDate, setAsOfDate] = useState(() => toISODate(new Date()));

  useEffect(() => {
    const refreshCurrentDate = () => {
      const nextDate = toISODate(new Date());
      setAsOfDate((current) => current === nextDate ? current : nextDate);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshCurrentDate();
    };
    const interval = window.setInterval(refreshCurrentDate, 60_000);
    window.addEventListener("focus", refreshCurrentDate);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCurrentDate);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let restored: CashForecastWeekInput[] | null = null;
    let storageError = "";
    let originalData: string | null = null;
    try {
      originalData = window.localStorage.getItem(STORAGE_KEY);
      const result = parseStoredCashForecast(originalData);
      if (result.ok) {
        restored = result.weeks;
      } else {
        storageError = result.error;
      }
    } catch {
      storageError = "Saved cash forecast could not be accessed. The original browser data has been preserved.";
    }
    window.setTimeout(() => {
      if (storageError) {
        setForecastStorageWritable(false);
        setForecastStorageError(t(storageError));
        setForecastRecoveryData(originalData);
      } else {
        if (restored) setWeeks(restored);
        setForecastStorageWritable(true);
      }
      setStorageReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!storageReady || !forecastStorageWritable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks));
    } catch {
      let originalData: string | null = null;
      try {
        originalData = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        // The recovery download remains unavailable if browser storage cannot be read.
      }
      setForecastStorageWritable(false);
      setForecastStorageError(t("The cash forecast could not be saved. Your latest changes may exist only in this session; download the last saved copy before leaving this page."));
      setForecastRecoveryData(originalData);
    }
  }, [weeks, storageReady, forecastStorageWritable]);

  useEffect(() => {
    const refreshInvoices = () => {
      const result = readStoredInvoices();
      if (result.ok) {
        setInvoices(result.invoices);
        setInvoiceStorageError("");
        setInvoiceRecoveryData(null);
      } else {
        let original: string | null = null;
        try { original = window.localStorage.getItem(INVOICE_STORAGE_KEY); } catch { /* Preserve the warning if storage is blocked. */ }
        setInvoices([]);
        setInvoiceStorageError(t(result.error));
        setInvoiceRecoveryData(original);
      }
    };
    refreshInvoices();
    window.addEventListener(INVOICE_UPDATED_EVENT, refreshInvoices);
    window.addEventListener("storage", refreshInvoices);
    return () => {
      window.removeEventListener(INVOICE_UPDATED_EVENT, refreshInvoices);
      window.removeEventListener("storage", refreshInvoices);
    };
  }, []);

  useEffect(() => {
    const refreshCashForecast = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const result = parseStoredCashForecast(raw);
        if (!result.ok) {
          setForecastStorageWritable(false);
          setForecastStorageError(t(result.error));
          setForecastRecoveryData(raw);
          return;
        }
        setWeeks(result.weeks);
        setForecastStorageWritable(true);
        setForecastStorageError("");
        setForecastRecoveryData(null);
      } catch {
        setForecastStorageWritable(false);
        setForecastStorageError(t("Saved cash forecast could not be accessed. The original browser data has been preserved."));
      }
    };
    window.addEventListener("enterpriseos:cash-forecast-updated", refreshCashForecast);
    return () => window.removeEventListener("enterpriseos:cash-forecast-updated", refreshCashForecast);
  }, []);

  const start = useMemo(() => mondayOf(new Date(`${asOfDate}T00:00:00`)), [asOfDate]);
  const dates = useMemo(() => Array.from({ length: 13 }, (_, index) => addDays(start, index * 7)), [start]);
  const futureDatedPayments = useMemo(() => findFutureDatedInvoicePayments(invoices, asOfDate), [invoices, asOfDate]);
  const invoiceProjection = useMemo(
    () => futureDatedPayments.length > 0
      ? allocateInvoicesToCashWeeks([], toISODate(start), 13, asOfDate)
      : allocateInvoicesToCashWeeks(invoices, toISODate(start), 13, asOfDate),
    [invoices, start, asOfDate, futureDatedPayments],
  );
  const forecastWeeks = useMemo(() => weeks.map((week, index) => includeInvoices ? ({
    ...week,
    collections: week.collections + invoiceProjection[index].receivableCollections,
    operatingPayments: week.operatingPayments + invoiceProjection[index].payablePayments,
  }) : week), [weeks, invoiceProjection, includeInvoices]);
  const results = useMemo(() => calculateCashForecast(openingCash, forecastWeeks), [openingCash, forecastWeeks]);
  const invoiceTotals = useMemo(() => invoiceProjection.reduce((total, week) => ({
    receivables: total.receivables + week.receivableCollections,
    payables: total.payables + week.payablePayments,
    overdueReceivables: total.overdueReceivables + week.overdueReceivables,
    overduePayables: total.overduePayables + week.overduePayables,
    receivableCount: total.receivableCount + week.receivableCount,
    payableCount: total.payableCount + week.payableCount,
  }), { receivables: 0, payables: 0, overdueReceivables: 0, overduePayables: 0, receivableCount: 0, payableCount: 0 }), [invoiceProjection]);
  const invoiceWeeksWithActivity = invoiceProjection.flatMap((week, index) =>
    week.receivableCollections > 0 || week.payablePayments > 0 ? [{ week, index }] : [],
  );
  const finalCash = results.at(-1)?.closingCash ?? openingCash;
  const lowestCash = Math.min(openingCash, ...results.map((week) => week.closingCash));
  const firstNegative = results.findIndex((week) => week.closingCash < 0);
  const stress = useMemo(() => calculateCashStressScenario(openingCash, forecastWeeks, collectionReduction, paymentIncrease), [openingCash, forecastWeeks, collectionReduction, paymentIncrease]);
  const stressDifference = stress.finalCash - finalCash;

  function updateWeek(index: number, key: keyof CashForecastWeekInput, raw: string) {
    if (!forecastStorageWritable) return;
    const value = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(value)) return;
    setWeeks((current) => current.map((week, weekIndex) =>
      weekIndex === index ? { ...week, [key]: Math.max(0, value) } : week,
    ));
  }

  function downloadRecoveryData(raw: string | null, filename: string) {
    if (raw === null) return;
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportForecast() {
    await downloadExcelWorkbook({
      filename: "enterpriseos-quarterly-cash-forecast.xlsx",
      sheets: [{
        name: t("Liquidity summary"),
        title: t("EnterpriseOS — Liquidity summary"),
        subtitle: t("Quarterly liquidity overview · EUR · Base forecast and downside sensitivity"),
        headers: [t("Metric"), t("Value"), t("Basis")],
        widths: [34, 22, 58],
        currencyLabels: [
          t("Opening cash"), t("Projected cash · Week 13"), t("Lowest projected cash"),
          t("Downside closing cash"), t("Lowest downside cash"), t("Change versus base case"),
        ],
        percentLabels: [t("Collection reduction"), t("Operating payment increase")],
        sectionLabels: [t("BASE CASE"), t("DOWNSIDE SCENARIO")],
        rows: [
          [t("BASE CASE"), null, null],
          [t("Opening cash"), openingCash, t("Linked to the closing cash in the three-statement model")],
          [t("Projected cash · Week 13"), finalCash, t("After all entered weekly movements")],
          [t("Lowest projected cash"), lowestCash, firstNegative >= 0 ? `${t("First negative balance: Week")} ${firstNegative + 1}` : t("No negative balance in the entered forecast")],
          [t("DOWNSIDE SCENARIO"), null, null],
          [t("Collection reduction"), collectionReduction / 100, "%"],
          [t("Operating payment increase"), paymentIncrease / 100, "%"],
          [t("Downside closing cash"), stress.finalCash, t("At the end of the quarter")],
          [t("Lowest downside cash"), stress.lowestCash, stress.firstNegativeWeek >= 0 ? `${t("First negative balance: Week")} ${stress.firstNegativeWeek + 1}` : t("No negative balance in the downside case")],
          [t("Change versus base case"), stressDifference, t("Difference in quarter-end cash")],
        ],
      }, {
        name: t("Quarterly cash forecast"),
        title: t("EnterpriseOS — Quarterly cash forecast"),
        subtitle: t("Direct-method forecast · EUR · Manual estimates plus separately identified invoice schedule"),
        headers: [
          t("Week starting"), t("Manual collections"), t("Invoice collections included"),
          t("Manual operating payments"), t("Invoice payments included"),
          t("Capital expenditure"), t("Debt service"), t("Net cash movement"), t("Closing cash"),
        ],
        widths: [18, 22, 22, 24, 22, 22, 18, 22, 22],
        currencyColumns: [2, 3, 4, 5, 6, 7, 8, 9],
        dateColumns: [1],
        totalLabels: [t("QUARTER TOTAL")],
        rows: [
          ...results.map((week, index) => [
          excelDateOnly(dates[index]),
          weeks[index].collections,
          includeInvoices ? invoiceProjection[index].receivableCollections : 0,
          weeks[index].operatingPayments,
          includeInvoices ? invoiceProjection[index].payablePayments : 0,
          weeks[index].capitalExpenditure, weeks[index].debtService,
          week.netCashMovement, week.closingCash,
          ]),
          [t("QUARTER TOTAL"), null, null, null, null, null, null, finalCash - openingCash, finalCash],
        ],
      }, {
        name: t("Invoice cash schedule"),
        title: t("EnterpriseOS — Invoice cash schedule"),
        subtitle: t("Open invoice balances by due date · Preview only unless enabled in the cash forecast"),
        headers: [
          t("Week starting"), t("Receivable collections"), t("Payable payments"),
          t("Overdue receivables"), t("Overdue payables"),
          t("Receivable invoices"), t("Payable invoices"),
        ],
        widths: [18, 22, 22, 22, 22, 20, 20],
        currencyColumns: [2, 3, 4, 5],
        dateColumns: [1],
        totalLabels: [t("QUARTER TOTAL")],
        rows: [
          ...invoiceProjection.map((week, index) => [
            excelDateOnly(dates[index]),
            week.receivableCollections, week.payablePayments, week.overdueReceivables,
            week.overduePayables, week.receivableCount, week.payableCount,
          ]),
          [t("QUARTER TOTAL"), invoiceTotals.receivables, invoiceTotals.payables, invoiceTotals.overdueReceivables, invoiceTotals.overduePayables, invoiceTotals.receivableCount, invoiceTotals.payableCount],
        ],
      }, {
        name: t("Downside scenario"),
        title: t("EnterpriseOS — Downside cash scenario"),
        subtitle: `${t("Collection reduction")}: ${collectionReduction}% · ${t("Operating payment increase")}: ${paymentIncrease}%`,
        headers: [t("Week"), t("Base closing cash"), t("Downside closing cash"), t("Downside net movement")],
        widths: [14, 24, 24, 24],
        currencyColumns: [2, 3, 4],
        totalLabels: [t("QUARTER TOTAL")],
        rows: [
          ...stress.weeks.map((week, index) => [index + 1, results[index].closingCash, week.closingCash, week.netCashMovement]),
          [t("QUARTER TOTAL"), finalCash, stress.finalCash, stress.finalCash - openingCash],
        ],
      }],
    });
  }

  return (
    <section className="cash-forecast-workspace" aria-labelledby="cash-forecast-title">
      <div className="cash-forecast-heading">
        <div>
          <span className="panel-kicker">{t("SHORT-TERM LIQUIDITY")}</span>
          <h2 id="cash-forecast-title">{t("Quarterly cash flow forecast")}</h2>
          <p>{t("Plan expected cash collections and payments week by week to anticipate liquidity pressure.")}</p>
        </div>
        <div className="cash-forecast-actions">
          <button type="button" className="secondary-button" disabled={!forecastStorageWritable} onClick={() => setWeeks(createEmptyCashForecast(13))}>{t("Clear forecast")}</button>
          <button type="button" className="primary-button" disabled={!forecastStorageWritable} onClick={exportForecast}>{t("Export forecast")}</button>
          {forecastRecoveryData !== null && <button type="button" className="secondary-button" onClick={() => downloadRecoveryData(forecastRecoveryData, "enterpriseos-cash-forecast-recovery.json")}>{t("Download original forecast data")}</button>}
          {invoiceRecoveryData !== null && <button type="button" className="secondary-button" onClick={() => downloadRecoveryData(invoiceRecoveryData, "enterpriseos-invoice-recovery.json")}>{t("Download original invoice data")}</button>}
        </div>
      </div>

      {forecastStorageError && <p className="cash-forecast-warning" role="alert">{forecastStorageError} {t("Editing and export are blocked until the original forecast is recovered or a valid backup is restored.")}</p>}
      {invoiceStorageError && <p className="cash-forecast-warning" role="alert">{invoiceStorageError} {t("Invoice projections are disabled because the complete invoice register could not be validated.")}</p>}
      {futureDatedPayments.length > 0 && <p className="cash-forecast-warning" role="alert">
        {t("Invoice projections are paused because the saved register contains future-dated payments. Review and remove any movements entered as planned rather than completed in Receivables & Payables.")}
        {" "}{futureDatedPayments.length} {t("future-dated payment records found.")}
      </p>}
      <section className="panel cash-forecast-invoice-panel" aria-labelledby="invoice-cash-integration-title">
        <div className="cash-forecast-invoice-head">
          <div>
            <span className="panel-kicker">{t("RECEIVABLES & PAYABLES")}</span>
            <h3 id="invoice-cash-integration-title">{t("Bring invoices into the cash forecast")}</h3>
            <p>{t("Open customer invoices become expected collections; open supplier invoices become operating payments, based on their due dates.")}</p>
          </div>
          <label className="cash-forecast-invoice-toggle">
            <input type="checkbox" checked={includeInvoices} disabled={Boolean(invoiceStorageError) || futureDatedPayments.length > 0} onChange={(event) => setIncludeInvoices(event.target.checked)} />
            <span>{t("Include open invoices")}</span>
          </label>
        </div>
        <div className="cash-forecast-invoice-summary">
          <div><span>{t("Open receivables · 13 weeks")}</span><strong>{formatMoney(invoiceTotals.receivables, language)}</strong><small>{invoiceTotals.receivableCount} {t("invoices")}</small></div>
          <div><span>{t("Open payables · 13 weeks")}</span><strong>{formatMoney(invoiceTotals.payables, language)}</strong><small>{invoiceTotals.payableCount} {t("invoices")}</small></div>
          <div><span>{t("Overdue receivables / payables")}</span><strong>{formatMoney(invoiceTotals.overdueReceivables, language)} / {formatMoney(invoiceTotals.overduePayables, language)}</strong><small>{t("Overdue balances placed in Week 1")}</small></div>
        </div>
        {invoiceWeeksWithActivity.length > 0 ? (
          <div className="cash-forecast-invoice-schedule">
            <div className="cash-forecast-invoice-schedule-title">{t("Invoice due-date preview")}</div>
            {invoiceWeeksWithActivity.map(({ week, index }) => (
              <div className="cash-forecast-invoice-row" key={index}>
                <span>{t("Week")} {index + 1} · {dates[index].toLocaleDateString(language === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "short" })}</span>
                <span>{t("Collections")}: <strong>{formatMoney(week.receivableCollections, language)}</strong></span>
                <span>{t("Payments")}: <strong>{formatMoney(week.payablePayments, language)}</strong></span>
              </div>
            ))}
          </div>
        ) : (
          <p className="cash-forecast-invoice-empty">{t("No open invoices fall within this quarter. Add invoices in Receivables & Payables to preview their cash impact.")}</p>
        )}
        <p className="cash-forecast-invoice-note">
          {t(includeInvoices
            ? "Open invoices are included in the forecast. Past-due balances are scheduled in Week 1; invoices after this quarter are excluded."
            : "Preview only until enabled. Past-due balances are scheduled in Week 1; invoices after this quarter are excluded.")}
          {" "}{t("Linked invoice amounts are added to manual estimates. Remove the same invoice amounts from manual inputs to avoid double counting.")}
        </p>
      </section>

      <div className="cash-forecast-kpis">
        <article className="panel"><span>{t("Opening cash")}</span><strong>{formatMoney(openingCash, language)}</strong><small>{t("Linked to the closing cash in the three-statement model")}</small></article>
        <article className="panel"><span>{t("Projected cash · Week 13")}</span><strong className={finalCash < 0 ? "negative" : ""}>{formatMoney(finalCash, language)}</strong><small>{t("After all entered weekly movements")}</small></article>
        <article className="panel"><span>{t("Lowest projected cash")}</span><strong className={lowestCash < 0 ? "negative" : ""}>{formatMoney(lowestCash, language)}</strong><small>{firstNegative >= 0 ? t("First negative balance: Week") + ` ${firstNegative + 1}` : t("No negative balance in the entered forecast")}</small></article>
      </div>

      <CashBalanceChart values={results.map((week) => week.closingCash)} openingCash={openingCash} language={language} stressValues={stress.weeks.map((week) => week.closingCash)} />

      <section className="panel cash-forecast-invoice-panel" aria-labelledby="cash-stress-title">
        <div className="cash-forecast-invoice-head"><div><span className="panel-kicker">{t("SCENARIO ANALYSIS")}</span><h3 id="cash-stress-title">{t("Downside liquidity stress test")}</h3><p>{t("Test what happens if customers pay later or operating costs rise. This is a sensitivity overlay, not a prediction.")}</p></div></div>
        <div className="operations-form">
          <label>{t("Collection reduction")} (%)<input type="number" min="0" max="100" step="1" value={collectionReduction} onChange={(event) => setCollectionReduction(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></label>
          <label>{t("Operating payment increase")} (%)<input type="number" min="0" max="500" step="1" value={paymentIncrease} onChange={(event) => setPaymentIncrease(Math.min(500, Math.max(0, Number(event.target.value) || 0)))} /></label>
        </div>
        <div className="cash-forecast-invoice-summary">
          <div><span>{t("Downside closing cash")}</span><strong className={stress.finalCash < 0 ? "negative" : ""}>{formatMoney(stress.finalCash, language)}</strong><small>{t("At the end of the quarter")}</small></div>
          <div><span>{t("Lowest downside cash")}</span><strong className={stress.lowestCash < 0 ? "negative" : ""}>{formatMoney(stress.lowestCash, language)}</strong><small>{stress.firstNegativeWeek >= 0 ? `${t("First negative balance: Week")} ${stress.firstNegativeWeek + 1}` : t("No negative balance in the downside case")}</small></div>
          <div><span>{t("Change versus base case")}</span><strong className={stressDifference < 0 ? "negative" : ""}>{formatMoney(stressDifference, language)}</strong><small>{t("Difference in quarter-end cash")}</small></div>
        </div>
        <p className="cash-forecast-invoice-note">{t("The stress test reduces all forecast collections by the selected percentage and increases operating payments by the selected percentage. Capital expenditure and debt service stay unchanged. It does not alter your saved base forecast.")}</p>
      </section>

      <div className="panel cash-forecast-table-card">
        <div className="cash-forecast-table-heading">
          <div><h3>{t("Weekly cash plan")}</h3><p>{t("Enter positive amounts. Payments are deducted automatically from the cash balance.")}</p></div>
          <span>{t("13 WEEKS · 1 QUARTER")}</span>
        </div>
        <div className="cash-forecast-table-scroll">
          <table className="cash-forecast-table">
            <thead><tr><th>{t("Week starting")}</th>{FIELDS.map((field) => <th key={field.key}>{t(field.short)}</th>)}<th>{t("Net movement")}</th><th>{t("Closing cash")}</th></tr></thead>
            <tbody>
              {results.map((week, index) => (
                <tr key={index}>
                  <th scope="row">{dates[index].toLocaleDateString(language === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "short" })}</th>
                  {FIELDS.map((field) => <td key={field.key}>
                    <label className="cash-forecast-input-wrap"><span className="sr-only">{t(field.label)} — {t("Week")} {index + 1}</span><input type="number" min="0" step="100" inputMode="decimal" disabled={!forecastStorageWritable} value={weeks[index][field.key] || ""} placeholder="0" onChange={(event) => updateWeek(index, field.key, event.target.value)} /></label>
                    {includeInvoices && field.key === "collections" && invoiceProjection[index].receivableCollections > 0 && <small className="cash-forecast-linked-amount">+{formatMoney(invoiceProjection[index].receivableCollections, language)} {t("invoices")}</small>}
                    {includeInvoices && field.key === "operatingPayments" && invoiceProjection[index].payablePayments > 0 && <small className="cash-forecast-linked-amount">+{formatMoney(invoiceProjection[index].payablePayments, language)} {t("invoices")}</small>}
                  </td>)}
                  <td className={week.netCashMovement < 0 ? "negative" : "positive"}>{formatMoney(week.netCashMovement, language)}</td>
                  <td className={week.closingCash < 0 ? "negative closing-cash" : "closing-cash"}>{formatMoney(week.closingCash, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cash-forecast-footnote">{t("This is a planning worksheet, not a bank feed. No transactions are generated or assumed. Manual entries and invoice projections remain separate; changes are saved only in this browser and are not shared with a company team or synced to a server.")}</div>
      </div>
    </section>
  );
}
