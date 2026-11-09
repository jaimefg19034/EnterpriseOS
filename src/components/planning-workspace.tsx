"use client";

import { useMemo, useState } from "react";
import {
  buildPlanningResult,
  makeDemoActualRevenue,
  SCENARIOS,
  type ActualRevenueByMonth,
  type MonthName,
  type PlanningAssumptions,
  type ScenarioKey,
} from "@/domain/planning";
import { formatCurrency, formatPercent } from "@/domain/financials";
import { translate, type Language } from "@/i18n/translations";
import { downloadExcelWorkbook } from "@/lib/excel-export";

const INITIAL_ASSUMPTIONS: PlanningAssumptions = {
  annualRevenueBudget: 2_976_000,
  costOfGoodsSoldPercent: 39,
  annualOperatingExpenses: 1_060_800,
  annualDepreciationAndAmortisation: 150_000,
  annualInterestExpense: 50_400,
  taxRatePercent: 25,
};

const ASSUMPTION_FIELDS: {
  key: keyof PlanningAssumptions;
  label: string;
  hint: string;
  suffix?: string;
  step: number;
}[] = [
  {
    key: "annualRevenueBudget",
    label: "Annual revenue budget",
    hint: "Full-year sales target",
    suffix: "€",
    step: 10_000,
  },
  {
    key: "costOfGoodsSoldPercent",
    label: "COGS as % of revenue",
    hint: "Direct cost ratio",
    suffix: "%",
    step: 0.5,
  },
  {
    key: "annualOperatingExpenses",
    label: "Annual operating expenses",
    hint: "Excluding depreciation and amortisation",
    suffix: "€",
    step: 5_000,
  },
  {
    key: "annualDepreciationAndAmortisation",
    label: "Annual D&A",
    hint: "Depreciation and amortisation",
    suffix: "€",
    step: 1_000,
  },
  {
    key: "annualInterestExpense",
    label: "Annual interest expense",
    hint: "Financing costs",
    suffix: "€",
    step: 1_000,
  },
  {
    key: "taxRatePercent",
    label: "Assumed tax rate",
    hint: "Applied to positive pre-tax profit",
    suffix: "%",
    step: 0.5,
  },
];

function PlanningChart({
  rows,
  language,
}: {
  rows: ReturnType<typeof buildPlanningResult>["monthlyRows"];
  language: Language;
}) {
  const t = (value: string) => translate(value, language);
  const max = Math.max(1, ...rows.map((row) =>
    Math.max(row.budgetRevenue, row.actualRevenue ?? 0, row.forecastRevenue ?? 0),
  )) * 1.12;
  const points = rows.map((row, index) => ({
    x: 32 + index * 48,
    budgetY: 173 - (row.budgetRevenue / max) * 136,
    performanceY:
      173 - ((row.actualRevenue ?? row.forecastRevenue ?? 0) / max) * 136,
  }));
  const budgetLine = points.map((point) => `${point.x},${point.budgetY}`).join(" ");
  const performanceLine = points
    .map((point) => `${point.x},${point.performanceY}`)
    .join(" ");

  return (
    <div className="planning-chart-wrap">
      <div className="planning-chart-legend">
        <span><i className="plan-legend-dot budget" /> {t("Budget")}</span>
        <span><i className="plan-legend-dot performance" /> {t("Actual / forecast")}</span>
        <span className="planning-chart-unit">{t("EUR · monthly")}</span>
      </div>
      <svg
        className="planning-chart"
        viewBox="0 0 590 202"
        role="img"
        aria-label={t("Monthly revenue budget compared with actual revenue through October and forecast for November and December")}
      >
        {[38, 83, 128, 173].map((y) => (
          <line
            key={y}
            x1="25"
            x2="565"
            y1={y}
            y2={y}
            className="chart-gridline"
          />
        ))}
        <polyline points={budgetLine} className="plan-budget-line" />
        <polyline points={performanceLine} className="plan-performance-line" />
        {points.map((point, index) => (
          <g key={t(rows[index].month)}>
            <circle cx={point.x} cy={point.budgetY} r="3" className="plan-budget-point" />
            <circle
              cx={point.x}
              cy={point.performanceY}
              r="3.5"
              className="plan-performance-point"
            />
            <text x={point.x} y="195" textAnchor="middle" className="chart-month">
              {rows[index].month}
            </text>
          </g>
        ))}
        <line
          x1={points[10].x - 15}
          x2={points[10].x - 15}
          y1="22"
          y2="176"
          className="forecast-divider"
        />
        <text x={points[10].x - 9} y="15" className="forecast-label">{t("FORECAST")}</text>
      </svg>
    </div>
  );
}

function PlanningMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "violet" | "amber";
}) {
  return (
    <article className="planning-metric">
      <div className="planning-metric-head">
        <span>{label}</span>
        <i className={`planning-metric-mark ${tone}`} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function PlanningWorkspace({ language }: { language: Language }) {
  const t = (value: string) => translate(value, language);
  const [assumptions, setAssumptions] =
    useState<PlanningAssumptions>(INITIAL_ASSUMPTIONS);
  const [actualRevenue, setActualRevenue] = useState<ActualRevenueByMonth>(() =>
    makeDemoActualRevenue(INITIAL_ASSUMPTIONS.annualRevenueBudget),
  );
  const [scenario, setScenario] = useState<ScenarioKey>("base");

  const result = useMemo(
    () => buildPlanningResult(assumptions, actualRevenue, scenario),
    [assumptions, actualRevenue, scenario],
  );
  const revenueVariancePercent =
    result.budgetRevenue > 0
      ? (result.revenueVariance / result.budgetRevenue) * 100
      : 0;
  const actualMonths = result.monthlyRows.filter(
    (row) => row.status === "Actual",
  ).length;

  function updateAssumption(
    key: keyof PlanningAssumptions,
    rawValue: string,
  ) {
    const value = rawValue === "" ? 0 : Number(rawValue);
    if (!Number.isFinite(value)) return;
    const max = key.endsWith("Percent") ? 100 : Number.MAX_SAFE_INTEGER;
    setAssumptions((current) => ({
      ...current,
      [key]: Math.min(max, Math.max(0, value)),
    }));
  }

  function updateActualRevenue(month: MonthName, rawValue: string) {
    const value = rawValue === "" ? 0 : Number(rawValue);
    if (!Number.isFinite(value)) return;
    setActualRevenue((current) => ({
      ...current,
      [month]: Math.max(0, value),
    }));
  }

  function resetDemo() {
    setAssumptions(INITIAL_ASSUMPTIONS);
    setActualRevenue(makeDemoActualRevenue(INITIAL_ASSUMPTIONS.annualRevenueBudget));
    setScenario("base");
  }

  async function exportPlanningCsv() {
    await downloadExcelWorkbook({
      filename: "enterpriseos-budget-scenarios-fy2026.xlsx",
      sheets: [
        {
          name: t("Monthly Plan"),
          title: t("EnterpriseOS — Budget & Scenarios"),
          subtitle: `FY 2026 · EUR · ${t("Scenario")}: ${t(result.scenario.label)} · ${actualMonths} ${t("actual revenue months")}`,
          headers: [t("Month"), t("Revenue budget"), t("Actual revenue"), t("Forecast revenue"), t("Variance"), t("Status")],
          widths: [16, 22, 22, 22, 20, 18],
          currencyColumns: [2, 3, 4, 5],
          totalLabels: [t("FULL YEAR TOTAL")],
          rows: [
            ...result.monthlyRows.map((row) => [
              t(row.month),
              row.budgetRevenue,
              row.actualRevenue,
              row.forecastRevenue,
              row.revenueVariance,
              t(row.status),
            ]),
            [t("FULL YEAR TOTAL"), result.budgetRevenue, result.actualRevenueToDate, result.remainingForecastRevenue, result.revenueVariance, ""],
          ],
        },
        {
          name: t("FY Summary"),
          title: t("EnterpriseOS — Full-year Summary"),
          subtitle: `FY 2026 · EUR · ${t("Scenario")}: ${t(result.scenario.label)}`,
          headers: [t("Metric"), t("Value"), t("Basis")],
          widths: [36, 22, 48],
          currencyColumns: [2],
          percentLabels: [t("Projected EBITDA margin")],
          totalLabels: [t("Projected full-year revenue"), t("Projected EBITDA"), t("Projected net income")],
          rows: [
            [t("Full-year budget revenue"), result.budgetRevenue, t("Annual budget")],
            [t("Actual revenue to date"), result.actualRevenueToDate, t("Entered actual revenue")],
            [t("Remaining forecast revenue"), result.remainingForecastRevenue, t("Scenario forecast")],
            [t("Projected full-year revenue"), result.projectedRevenue, t("Actuals plus forecast")],
            [t("Revenue variance"), result.revenueVariance, t("Projected revenue less budget")],
            [t("Projected cost of goods sold"), result.projectedCostOfGoodsSold, `${result.costOfGoodsSoldPercent.toFixed(1)}% ${t("of revenue")}`],
            [t("Projected gross profit"), result.projectedGrossProfit, t("Revenue less COGS")],
            [t("Projected operating expenses"), result.projectedOperatingExpenses, t("Annual operating cost assumption")],
            [t("Projected EBITDA"), result.projectedEbitda, t("Gross profit less operating expenses")],
            [t("Projected EBITDA margin"), result.projectedEbitdaMarginPercent / 100, t("EBITDA / projected revenue")],
            [t("Projected EBIT"), result.projectedEbit, t("EBITDA less D&A")],
            [t("Projected net income"), result.projectedNetIncome, t("After interest and assumed tax")],
          ],
        },
        {
          name: t("Assumptions"),
          title: t("EnterpriseOS — Planning Assumptions"),
          subtitle: t("Illustrative assumptions · Review before using for decisions"),
          headers: [t("Assumption"), t("Value"), t("Unit")],
          widths: [40, 22, 18],
          percentLabels: [t("COGS as % of revenue"), t("Assumed tax rate"), t("Scenario revenue adjustment"), t("Scenario COGS adjustment")],
          rows: [
            [t("Annual revenue budget"), assumptions.annualRevenueBudget, "EUR"],
            [t("COGS as % of revenue"), assumptions.costOfGoodsSoldPercent / 100, "%"],
            [t("Annual operating expenses"), assumptions.annualOperatingExpenses, "EUR"],
            [t("Annual D&A"), assumptions.annualDepreciationAndAmortisation, "EUR"],
            [t("Annual interest expense"), assumptions.annualInterestExpense, "EUR"],
            [t("Assumed tax rate"), assumptions.taxRatePercent / 100, "%"],
            [t("Scenario revenue adjustment"), result.scenario.revenueGrowthPercent / 100, "%"],
            [t("Scenario COGS adjustment"), result.scenario.cogsRateAdjustmentPp / 100, "percentage points"],
          ],
        },
      ],
    });
  }

  return (
    <div className="planning-workspace">
      <div className="page-heading planning-heading">
        <div>
          <div className="eyebrow">
            {t("FINANCIAL PLANNING")} <span className="eyebrow-dot" /> {t("FY 2026 · THROUGH OCTOBER")}
          </div>
          <h1>{t("Budget & scenarios")}</h1>
          <p>{t("Track revenue against budget and stress-test the remaining two months under different operating assumptions.")}</p>
        </div>
        <div className="heading-actions">
          <span className="demo-badge"><i /> {t("SAMPLE DATA")}</span>
          <button className="secondary-button" onClick={resetDemo}>{t("Reset demo")}</button>
          <button className="primary-button" onClick={exportPlanningCsv}>
            <span aria-hidden="true">↓</span> {t("Export plan")}
          </button>
        </div>
      </div>

      <section className="planning-scenario-panel panel">
        <div className="planning-scenario-intro">
          <div className="panel-kicker">{t("SCENARIO SELECTOR")}</div>
          <h2>{t("What happens if assumptions change?")}</h2>
          <p>{t("Choose a scenario to update the revenue forecast and annual profitability model.")}</p>
        </div>
        <div className="scenario-options" role="group" aria-label={t("Forecast scenario")}>
          {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => {
            const option = SCENARIOS[key];
            return (
              <button
                key={key}
                className={`scenario-option ${scenario === key ? "selected" : ""} ${key}`}
                onClick={() => setScenario(key)}
                aria-pressed={scenario === key}
              >
                <span className="scenario-option-top">
                  <strong>{t(option.label)}</strong>
                  {scenario === key && <span className="scenario-selected-dot" />}
                </span>
                <small>{t(key === "base" ? "0% revenue change" : key === "upside" ? "+12% revenue" : "−12% revenue")}</small>
              </button>
            );
          })}
        </div>
        <div className="scenario-description">
          <span className="scenario-description-icon">{t("ƒx")}</span>
          <span>{t(result.scenario.description)}</span>
        </div>
      </section>

      <div className="planning-metrics-grid">
        <PlanningMetric
          label={t("Projected FY revenue")}
          value={formatCurrency(result.projectedRevenue, true)}
          detail={`${revenueVariancePercent >= 0 ? "+" : ""}${formatPercent(revenueVariancePercent)} ${t("vs. annual budget")}`}
          tone="blue"
        />
        <PlanningMetric
          label={t("Projected EBITDA")}
          value={formatCurrency(result.projectedEbitda, true)}
          detail={`${result.ebitdaVariance >= 0 ? "+" : ""}${formatCurrency(result.ebitdaVariance, true)} {t("vs. budget EBITDA")}`}
          tone="green"
        />
        <PlanningMetric
          label={t("Projected EBITDA margin")}
          value={formatPercent(result.projectedEbitdaMarginPercent)}
          detail={`${t("COGS assumption:")} ${formatPercent(result.costOfGoodsSoldPercent)}`}
          tone="violet"
        />
        <PlanningMetric
          label={t("Projected net income")}
          value={formatCurrency(result.projectedNetIncome, true)}
          detail={`${t("Tax assumption:")} ${formatPercent(result.assumptions.taxRatePercent)}`}
          tone="amber"
        />
      </div>

      <div className="planning-main-grid">
        <section className="panel planning-assumptions-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">{t("MODEL DRIVERS")}</div>
              <h2>{t("Annual assumptions")}</h2>
              <p>{t("Change inputs to recalculate the scenario.")}</p>
            </div>
            <span className="input-count">{t("06 INPUTS")}</span>
          </div>
          <div className="planning-assumption-list">
            {ASSUMPTION_FIELDS.map((field, index) => (
              <label className="planning-assumption-field" key={field.key}>
                <span className="planning-field-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="planning-field-label">
                  <strong>{t(field.label)}</strong>
                  <small>{t(field.hint)}</small>
                </span>
                <span className="planning-input-wrap">
                  {field.suffix === "€" && <span>€</span>}
                  <input
                    type="number"
                    min="0"
                    max={field.suffix === "%" ? 100 : undefined}
                    step={field.step}
                    value={assumptions[field.key]}
                    aria-label={t(field.label)}
                    onChange={(event) => updateAssumption(field.key, event.target.value)}
                  />
                  {field.suffix === "%" && <span>%</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="planning-assumption-note">
            <span aria-hidden="true">ⓘ</span>
            <p>{t("Scenario adjustments change future revenue, COGS ratio and annual operating costs. The monthly revenue profile uses illustrative seasonality weights.")}</p>
          </div>
        </section>

        <section className="panel planning-performance-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">{t("REVENUE PERFORMANCE")}</div>
              <h2>{t("Budget vs. actual & forecast")}</h2>
              <p>{t("January–October actuals · November–December forecast")}</p>
            </div>
            <span className="live-badge"><i /> {t("LIVE MODEL")}</span>
          </div>
          <PlanningChart rows={result.monthlyRows} language={language} />
          <div className="planning-chart-summary">
            <div><span>{t("Actual revenue to date")}</span><strong>{formatCurrency(result.actualRevenueToDate, true)}</strong></div>
            <div><span>{t("Budget to date")}</span><strong>{formatCurrency(result.budgetRevenueToDate, true)}</strong></div>
            <div><span>{t("Remaining forecast")}</span><strong>{formatCurrency(result.remainingForecastRevenue, true)}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel monthly-plan-panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">{t("MONTHLY DETAIL")}</div>
            <h2>{t("Revenue plan by month")}</h2>
            <p>{t("Edit the closed-month actual revenue values. Future months use the selected scenario.")}</p>
          </div>
          <span className="input-count">{t("12 MONTHS")}</span>
        </div>
        <div className="monthly-table-scroll">
          <table className="monthly-plan-table">
            <thead>
              <tr>
                <th>{t("PERIOD")}</th>
                <th>{t("REVENUE BUDGET")}</th>
                <th>{t("ACTUAL / FORECAST")}</th>
                <th>{t("VARIANCE")}</th>
                <th>{t("STATUS")}</th>
              </tr>
            </thead>
            <tbody>
              {result.monthlyRows.map((row) => (
                <tr key={row.month}>
                  <td className="month-cell">{t(row.month)} 2026</td>
                  <td>{formatCurrency(row.budgetRevenue)}</td>
                  <td>
                    {row.status === "Actual" ? (
                      <label className="actual-revenue-input">
                        <span className="sr-only">{t("Actual revenue for")} {t(row.month)}</span>
                        <span>€</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={actualRevenue[row.month] ?? 0}
                          onChange={(event) => updateActualRevenue(row.month, event.target.value)}
                          aria-label={`${t("Actual revenue for")} ${t(row.month)}`}
                        />
                      </label>
                    ) : (
                      <strong className="forecast-value">
                        {formatCurrency(row.forecastRevenue ?? 0)}
                      </strong>
                    )}
                  </td>
                  <td>
                    {row.revenueVariance === null ? (
                      <span className="variance-muted">—</span>
                    ) : (
                      <span className={`variance-value ${row.revenueVariance >= 0 ? "positive" : "negative"}`}>
                        {row.revenueVariance >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(row.revenueVariance))}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`month-status ${row.status === "Actual" ? "actual" : "forecast"}`}>
                      <i /> {t(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("Full year")}</td>
                <td>{formatCurrency(result.budgetRevenue)}</td>
                <td><strong>{formatCurrency(result.projectedRevenue)}</strong></td>
                <td>
                  <span className={`variance-value ${result.revenueVariance >= 0 ? "positive" : "negative"}`}>
                    {result.revenueVariance >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(result.revenueVariance))}
                  </span>
                </td>
                <td><span className="month-status forecast"><i /> {t("Projected")}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="planning-profit-panel panel">
        <div className="planning-profit-heading">
          <div className="panel-kicker">{t("FULL-YEAR PROFITABILITY MODEL")}</div>
          <h2>{t("Projected income statement")}</h2>
          <p>{t("Annual projection based on actual revenue entered to date and the selected scenario's cost assumptions.")}</p>
        </div>
        <div className="planning-profit-table">
          <div><span>{t("Projected revenue")}</span><strong>{formatCurrency(result.projectedRevenue)}</strong></div>
          <div><span>{t("Projected cost of goods sold")}</span><strong>({formatCurrency(result.projectedCostOfGoodsSold)})</strong></div>
          <div className="profit-subtotal"><span>{t("Projected gross profit")}</span><strong>{formatCurrency(result.projectedGrossProfit)}</strong></div>
          <div><span>{t("Annual operating expenses")}</span><strong>({formatCurrency(result.projectedOperatingExpenses)})</strong></div>
          <div className="profit-ebitda"><span>{t("Projected EBITDA")}</span><strong>{formatCurrency(result.projectedEbitda)}</strong></div>
          <div><span>{t("Depreciation & amortisation")}</span><strong>({formatCurrency(result.projectedDepreciationAndAmortisation)})</strong></div>
          <div className="profit-subtotal"><span>{t("Projected EBIT")}</span><strong>{formatCurrency(result.projectedEbit)}</strong></div>
          <div><span>{t("Interest expense")}</span><strong>({formatCurrency(result.projectedInterestExpense)})</strong></div>
          <div className="profit-subtotal"><span>{t("Projected profit before tax")}</span><strong>{formatCurrency(result.projectedProfitBeforeTax)}</strong></div>
          <div><span>{t("Modelled income tax")}</span><strong>({formatCurrency(result.projectedIncomeTax)})</strong></div>
          <div className="profit-net"><span>{t("Projected net income")}</span><strong>{formatCurrency(result.projectedNetIncome)}</strong></div>
        </div>
      </section>

      <div className="planning-disclaimer">
        <span aria-hidden="true">ⓘ</span>
        <p>
          <strong>{t("Demo model — not company accounts.")}</strong> {t("January–October revenue values are editable sample actuals. Historical COGS and operating expenses are not entered as actuals; annual EBITDA, EBIT and net income are modelled using the selected scenario assumptions. Replace the illustrative monthly seasonality with company-specific data before using this for decisions.")}
        </p>
      </div>
    </div>
  );
}
