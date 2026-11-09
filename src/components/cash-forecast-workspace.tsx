"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateCashForecast,
  calculateCashStressScenario,
  createEmptyCashForecast,
  type CashForecastWeekInput,
} from "@/domain/cash-forecast";
import { downloadExcelWorkbook } from "@/lib/excel-export";
import { allocateInvoicesToCashWeeks } from "@/domain/invoice-cash-integration";
import { validateWorkingCapitalInvoice, type WorkingCapitalInvoice } from "@/domain/working-capital";
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

function readStoredInvoices(): WorkingCapitalInvoice[] {
  try {
    const raw = window.localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => validateWorkingCapitalInvoice(item))
      .filter((result) => result.valid)
      .map((result) => result.invoice);
  } catch {
    return [];
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
  const all = [openingCash, ...values];
  const min = Math.min(0, ...all);
  const max = Math.max(1, ...all);
  const range = Math.max(1, max - min);
  const x = (index: number) => 24 + (index / Math.max(1, all.length - 1)) * 672;
  const y = (value: number) => 145 - ((value - min) / range) * 118;
  const points = all.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const stressPoints = stressValues ? [openingCash, ...stressValues].map((value, index) => `${x(index)},${y(value)}`).join(" ") : "";\n  const zeroY = y(0);
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
        <polyline points={points} fill="none" stroke="#5872c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />\n        {stressValues && <polyline points={stressPoints} fill="none" stroke="#d28b45" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />}
        {all.map((value, index) => <circle key={index} cx={x(index)} cy={y(value)} r={index === all.length - 1 ? 4.5 : 2.7} fill={value < 0 ? "#c96e70" : "#5872c7"} />)}
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
  const [invoices, setInvoices] = useState<WorkingCapitalInvoice[]>([]);
  const [includeInvoices, setIncludeInvoices] = useState(false);\n  const [collectionReduction, setCollectionReduction] = useState(15);\n  const [paymentIncrease, setPaymentIncrease] = useState(10);

  useEffect(() => {
    let restored: CashForecastWeekInput[] | null = null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 13) {
          restored = parsed.map((item): CashForecastWeekInput => {
            const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
            const amount = (key: keyof CashForecastWeekInput) => {
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
        }
      }
    } catch {
      // Storage can be disabled by browser privacy settings; the worksheet remains usable in memory.
    }
    window.setTimeout(() => {
      if (restored) setWeeks(restored);
      setStorageReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks));
    } catch {
      // Keep edits in the current session if local storage is unavailable or full.
    }
  }, [weeks, storageReady]);

  useEffect(() => {
    const refreshInvoices = () => setInvoices(readStoredInvoices());
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
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length !== 13) return;
        const restored = parsed.map((item): CashForecastWeekInput => {
          const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
          const amount = (key: keyof CashForecastWeekInput) => {
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
        setWeeks(restored);
      } catch {
        // A failed restore never clears the current in-memory worksheet.
      }
    };
    window.addEventListener("enterpriseos:cash-forecast-updated", refreshCashForecast);
    return () => window.removeEventListener("enterpriseos:cash-forecast-updated", refreshCashForecast);
  }, []);

  const start = useMemo(() => mondayOf(new Date()), []);
  const asOfDate = useMemo(() => toISODate(new Date()), []);
  const dates = useMemo(() => Array.from({ length: 13 }, (_, index) => addDays(start, index * 7)), [start]);
  const invoiceProjection = useMemo(
    () => allocateInvoicesToCashWeeks(invoices, toISODate(start), 13, asOfDate),
    [invoices, start, asOfDate],
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
  const firstNegative = results.findIndex((week) => week.closingCash < 0);\n  const stress = useMemo(() => calculateCashStressScenario(openingCash, forecastWeeks, collectionReduction, paymentIncrease), [openingCash, forecastWeeks, collectionReduction, paymentIncrease]);\n  const stressDifference = stress.finalCash - finalCash;

  function updateWeek(index: number, key: keyof CashForecastWeekInput, raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(value)) return;
    setWeeks((current) => current.map((week, weekIndex) =>
      weekIndex === index ? { ...week, [key]: Math.max(0, value) } : week,
    ));
  }

  async function exportForecast() {
    await downloadExcelWorkbook({
      filename: "enterpriseos-quarterly-cash-forecast.xlsx",
      sheets: [{
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
        totalLabels: [t("Net cash movement"), t("Closing cash")],
        rows: results.map((week, index) => [
          dates[index].toLocaleDateString(language === "es" ? "es-ES" : "en-GB"),
          weeks[index].collections,
          includeInvoices ? invoiceProjection[index].receivableCollections : 0,
          weeks[index].operatingPayments,
          includeInvoices ? invoiceProjection[index].payablePayments : 0,
          weeks[index].capitalExpenditure, weeks[index].debtService,
          week.netCashMovement, week.closingCash,
        ]),
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
        rows: invoiceProjection.map((week, index) => [
          dates[index].toLocaleDateString(language === "es" ? "es-ES" : "en-GB"),
          week.receivableCollections, week.payablePayments, week.overdueReceivables,
          week.overduePayables, week.receivableCount, week.payableCount,
        ]),
      }, {
        name: t("Downside scenario"),
        title: t("EnterpriseOS — Downside cash scenario"),
        subtitle: `${t("Collection reduction")}: ${collectionReduction}% · ${t("Operating payment increase")}: ${paymentIncrease}%`,
        headers: [t("Week"), t("Base closing cash"), t("Downside closing cash"), t("Downside net movement")],
        widths: [14, 24, 24, 24],
        currencyColumns: [2, 3, 4],
        rows: stress.weeks.map((week, index) => [index + 1, results[index].closingCash, week.closingCash, week.netCashMovement]),
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
          <button type="button" className="secondary-button" onClick={() => setWeeks(createEmptyCashForecast(13))}>{t("Clear forecast")}</button>
          <button type="button" className="primary-button" onClick={exportForecast}>{t("Export forecast")}</button>
        </div>
      </div>

      <section className="panel cash-forecast-invoice-panel" aria-labelledby="invoice-cash-integration-title">
        <div className="cash-forecast-invoice-head">
          <div>
            <span className="panel-kicker">{t("RECEIVABLES & PAYABLES")}</span>
            <h3 id="invoice-cash-integration-title">{t("Bring invoices into the cash forecast")}</h3>
            <p>{t("Open customer invoices become expected collections; open supplier invoices become operating payments, based on their due dates.")}</p>
          </div>
          <label className="cash-forecast-invoice-toggle">
            <input type="checkbox" checked={includeInvoices} onChange={(event) => setIncludeInvoices(event.target.checked)} />
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

      <CashBalanceChart values={results.map((week) => week.closingCash)} openingCash={openingCash} language={language} stressValues={stress.weeks.map((week) => week.closingCash)} />\n\n      <section className="panel cash-forecast-invoice-panel" aria-labelledby="cash-stress-title">\n        <div className="cash-forecast-invoice-head"><div><span className="panel-kicker">{t("SCENARIO ANALYSIS")}</span><h3 id="cash-stress-title">{t("Downside liquidity stress test")}</h3><p>{t("Test what happens if customers pay later or operating costs rise. This is a sensitivity overlay, not a prediction.")}</p></div></div>\n        <div className="operations-form">\n          <label>{t("Collection reduction")} (%)<input type="number" min="0" max="100" step="1" value={collectionReduction} onChange={(event) => setCollectionReduction(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></label>\n          <label>{t("Operating payment increase")} (%)<input type="number" min="0" max="500" step="1" value={paymentIncrease} onChange={(event) => setPaymentIncrease(Math.min(500, Math.max(0, Number(event.target.value) || 0)))} /></label>\n        </div>\n        <div className="cash-forecast-invoice-summary">\n          <div><span>{t("Downside closing cash")}</span><strong className={stress.finalCash < 0 ? "negative" : ""}>{formatMoney(stress.finalCash, language)}</strong><small>{t("At the end of the quarter")}</small></div>\n          <div><span>{t("Lowest downside cash")}</span><strong className={stress.lowestCash < 0 ? "negative" : ""}>{formatMoney(stress.lowestCash, language)}</strong><small>{stress.firstNegativeWeek >= 0 ? `${t("First negative balance: Week")} ${stress.firstNegativeWeek + 1}` : t("No negative balance in the downside case")}</small></div>\n          <div><span>{t("Change versus base case")}</span><strong className={stressDifference < 0 ? "negative" : ""}>{formatMoney(stressDifference, language)}</strong><small>{t("Difference in quarter-end cash")}</small></div>\n        </div>\n        <p className="cash-forecast-invoice-note">{t("The stress test reduces all forecast collections by the selected percentage and increases operating payments by the selected percentage. Capital expenditure and debt service stay unchanged. It does not alter your saved base forecast.")}</p>\n      </section>

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
                    <label className="cash-forecast-input-wrap"><span className="sr-only">{t(field.label)} — {t("Week")} {index + 1}</span><input type="number" min="0" step="100" inputMode="decimal" value={weeks[index][field.key] || ""} placeholder="0" onChange={(event) => updateWeek(index, field.key, event.target.value)} /></label>
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
