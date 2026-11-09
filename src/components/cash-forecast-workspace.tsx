"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateCashForecast,
  createEmptyCashForecast,
  type CashForecastWeekInput,
} from "@/domain/cash-forecast";
import { downloadExcelWorkbook } from "@/lib/excel-export";
import { translate, type Language } from "@/i18n/translations";

type CashForecastWorkspaceProps = {
  openingCash: number;
  language: Language;
};

const STORAGE_KEY = "enterpriseos:cash-forecast:v1";

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

function CashBalanceChart({ values, openingCash, language }: {
  values: number[];
  openingCash: number;
  language: Language;
}) {
  const all = [openingCash, ...values];
  const min = Math.min(0, ...all);
  const max = Math.max(1, ...all);
  const range = Math.max(1, max - min);
  const x = (index: number) => 24 + (index / Math.max(1, all.length - 1)) * 672;
  const y = (value: number) => 145 - ((value - min) / range) * 118;
  const points = all.map((value, index) => `${x(index)},${y(value)}`).join(" ");
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

  const results = useMemo(() => calculateCashForecast(openingCash, weeks), [openingCash, weeks]);
  const start = useMemo(() => mondayOf(new Date()), []);
  const dates = useMemo(() => Array.from({ length: 13 }, (_, index) => addDays(start, index * 7)), [start]);
  const finalCash = results.at(-1)?.closingCash ?? openingCash;
  const lowestCash = Math.min(openingCash, ...results.map((week) => week.closingCash));
  const firstNegative = results.findIndex((week) => week.closingCash < 0);

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
        subtitle: t("Direct-method forecast · EUR · User-entered weekly estimates, not actual transactions"),
        headers: [t("Week starting"), ...FIELDS.map((field) => t(field.label)), t("Net cash movement"), t("Closing cash")],
        widths: [18, 22, 22, 22, 22, 22, 22],
        currencyColumns: [2, 3, 4, 5, 6, 7],
        totalLabels: [t("Net cash movement"), t("Closing cash")],
        rows: results.map((week, index) => [
          dates[index].toLocaleDateString(language === "es" ? "es-ES" : "en-GB"),
          week.collections, week.operatingPayments, week.capitalExpenditure, week.debtService,
          week.netCashMovement, week.closingCash,
        ]),
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

      <div className="cash-forecast-kpis">
        <article className="panel"><span>{t("Opening cash")}</span><strong>{formatMoney(openingCash, language)}</strong><small>{t("Linked to the closing cash in the three-statement model")}</small></article>
        <article className="panel"><span>{t("Projected cash · Week 13")}</span><strong className={finalCash < 0 ? "negative" : ""}>{formatMoney(finalCash, language)}</strong><small>{t("After all entered weekly movements")}</small></article>
        <article className="panel"><span>{t("Lowest projected cash")}</span><strong className={lowestCash < 0 ? "negative" : ""}>{formatMoney(lowestCash, language)}</strong><small>{firstNegative >= 0 ? t("First negative balance: Week") + ` ${firstNegative + 1}` : t("No negative balance in the entered forecast")}</small></article>
      </div>

      <CashBalanceChart values={results.map((week) => week.closingCash)} openingCash={openingCash} language={language} />

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
                  {FIELDS.map((field) => <td key={field.key}><label className="cash-forecast-input-wrap"><span className="sr-only">{t(field.label)} — {t("Week")} {index + 1}</span><input type="number" min="0" step="100" inputMode="decimal" value={week[field.key] || ""} placeholder="0" onChange={(event) => updateWeek(index, field.key, event.target.value)} /></label></td>)}
                  <td className={week.netCashMovement < 0 ? "negative" : "positive"}>{formatMoney(week.netCashMovement, language)}</td>
                  <td className={week.closingCash < 0 ? "negative closing-cash" : "closing-cash"}>{formatMoney(week.closingCash, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cash-forecast-footnote">{t("This is a planning worksheet, not a bank feed. No transactions are generated or assumed. Your entries are saved only in this browser and are not shared with a company team or synced to a server.")}</div>
      </div>
    </section>
  );
}
