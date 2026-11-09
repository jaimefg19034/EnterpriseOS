"use client";

import { useMemo, useState } from "react";
import {
  buildPlanningResult,
  makeDemoActualRevenue,
  MONTHS,
  SCENARIOS,
  type ActualRevenueByMonth,
  type MonthName,
  type PlanningAssumptions,
  type ScenarioKey,
} from "@/domain/planning";
import { formatCurrency, formatPercent } from "@/domain/financials";

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
}: {
  rows: ReturnType<typeof buildPlanningResult>["monthlyRows"];
}) {
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
        <span><i className="plan-legend-dot budget" /> Budget</span>
        <span><i className="plan-legend-dot performance" /> Actual / forecast</span>
        <span className="planning-chart-unit">EUR · monthly</span>
      </div>
      <svg
        className="planning-chart"
        viewBox="0 0 590 202"
        role="img"
        aria-label="Monthly revenue budget compared with actual revenue through October and forecast for November and December"
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
          <g key={rows[index].month}>
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
        <text x={points[10].x - 9} y="15" className="forecast-label">FORECAST</text>
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

export function PlanningWorkspace() {
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

  function exportPlanningCsv() {
    const rows = [
      ["EnterpriseOS — FY 2026 budget and scenario plan"],
      ["Scenario", result.scenario.label],
      ["Currency", "EUR"],
      ["Actual revenue months", String(actualMonths)],
      [],
      ["Month", "Revenue budget", "Actual revenue", "Forecast revenue", "Variance", "Status"],
      ...result.monthlyRows.map((row) => [
        row.month,
        row.budgetRevenue.toFixed(2),
        row.actualRevenue === null ? "" : row.actualRevenue.toFixed(2),
        row.forecastRevenue === null ? "" : row.forecastRevenue.toFixed(2),
        row.revenueVariance === null ? "" : row.revenueVariance.toFixed(2),
        row.status,
      ]),
      [],
      ["Full-year budget revenue", result.budgetRevenue.toFixed(2)],
      ["Actual revenue to date", result.actualRevenueToDate.toFixed(2)],
      ["Remaining forecast revenue", result.remainingForecastRevenue.toFixed(2)],
      ["Projected full-year revenue", result.projectedRevenue.toFixed(2)],
      ["Projected EBITDA", result.projectedEbitda.toFixed(2)],
      ["Projected EBITDA margin", result.projectedEbitdaMarginPercent.toFixed(2) + "%"],
      ["Projected net income", result.projectedNetIncome.toFixed(2)],
      [],
      ["Important", "Profitability is modelled using annual cost assumptions. Historical COGS and operating expenses are not actuals."],
      ["Seasonality", "Illustrative monthly weights; replace with company-specific seasonality before relying on the plan."],
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            return `"${value.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "enterpriseos-budget-scenarios-fy2026.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="planning-workspace">
      <div className="page-heading planning-heading">
        <div>
          <div className="eyebrow">
            FINANCIAL PLANNING <span className="eyebrow-dot" /> FY 2026 · THROUGH OCTOBER
          </div>
          <h1>Budget &amp; scenarios</h1>
          <p>Track revenue against budget and stress-test the remaining two months under different operating assumptions.</p>
        </div>
        <div className="heading-actions">
          <span className="demo-badge"><i /> SAMPLE DATA</span>
          <button className="secondary-button" onClick={resetDemo}>Reset demo</button>
          <button className="primary-button" onClick={exportPlanningCsv}>
            <span aria-hidden="true">↓</span> Export plan
          </button>
        </div>
      </div>

      <section className="planning-scenario-panel panel">
        <div className="planning-scenario-intro">
          <div className="panel-kicker">SCENARIO SELECTOR</div>
          <h2>What happens if assumptions change?</h2>
          <p>Choose a scenario to update the revenue forecast and annual profitability model.</p>
        </div>
        <div className="scenario-options" role="group" aria-label="Forecast scenario">
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
                  <strong>{option.label}</strong>
                  {scenario === key && <span className="scenario-selected-dot" />}
                </span>
                <small>{key === "base" ? "0% revenue change" : key === "upside" ? "+12% revenue" : "−12% revenue"}</small>
              </button>
            );
          })}
        </div>
        <div className="scenario-description">
          <span className="scenario-description-icon">ƒx</span>
          <span>{result.scenario.description}</span>
        </div>
      </section>

      <div className="planning-metrics-grid">
        <PlanningMetric
          label="Projected FY revenue"
          value={formatCurrency(result.projectedRevenue, true)}
          detail={`${revenueVariancePercent >= 0 ? "+" : ""}${formatPercent(revenueVariancePercent)} vs. annual budget`}
          tone="blue"
        />
        <PlanningMetric
          label="Projected EBITDA"
          value={formatCurrency(result.projectedEbitda, true)}
          detail={`${result.ebitdaVariance >= 0 ? "+" : ""}${formatCurrency(result.ebitdaVariance, true)} vs. budget EBITDA`}
          tone="green"
        />
        <PlanningMetric
          label="Projected EBITDA margin"
          value={formatPercent(result.projectedEbitdaMarginPercent)}
          detail={`COGS assumption: ${formatPercent(result.costOfGoodsSoldPercent)}`}
          tone="violet"
        />
        <PlanningMetric
          label="Projected net income"
          value={formatCurrency(result.projectedNetIncome, true)}
          detail={`Tax assumption: ${formatPercent(result.assumptions.taxRatePercent)}`}
          tone="amber"
        />
      </div>

      <div className="planning-main-grid">
        <section className="panel planning-assumptions-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">MODEL DRIVERS</div>
              <h2>Annual assumptions</h2>
              <p>Change inputs to recalculate the scenario.</p>
            </div>
            <span className="input-count">06 INPUTS</span>
          </div>
          <div className="planning-assumption-list">
            {ASSUMPTION_FIELDS.map((field, index) => (
              <label className="planning-assumption-field" key={field.key}>
                <span className="planning-field-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="planning-field-label">
                  <strong>{field.label}</strong>
                  <small>{field.hint}</small>
                </span>
                <span className="planning-input-wrap">
                  {field.suffix === "€" && <span>€</span>}
                  <input
                    type="number"
                    min="0"
                    max={field.suffix === "%" ? 100 : undefined}
                    step={field.step}
                    value={assumptions[field.key]}
                    aria-label={field.label}
                    onChange={(event) => updateAssumption(field.key, event.target.value)}
                  />
                  {field.suffix === "%" && <span>%</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="planning-assumption-note">
            <span aria-hidden="true">ⓘ</span>
            <p>Scenario adjustments change future revenue, COGS ratio and annual operating costs. The monthly revenue profile uses illustrative seasonality weights.</p>
          </div>
        </section>

        <section className="panel planning-performance-panel">
          <div className="panel-header">
            <div>
              <div className="panel-kicker">REVENUE PERFORMANCE</div>
              <h2>Budget vs. actual &amp; forecast</h2>
              <p>January–October actuals · November–December forecast</p>
            </div>
            <span className="live-badge"><i /> LIVE MODEL</span>
          </div>
          <PlanningChart rows={result.monthlyRows} />
          <div className="planning-chart-summary">
            <div><span>Actual revenue to date</span><strong>{formatCurrency(result.actualRevenueToDate, true)}</strong></div>
            <div><span>Budget to date</span><strong>{formatCurrency(result.budgetRevenueToDate, true)}</strong></div>
            <div><span>Remaining forecast</span><strong>{formatCurrency(result.remainingForecastRevenue, true)}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel monthly-plan-panel">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">MONTHLY DETAIL</div>
            <h2>Revenue plan by month</h2>
            <p>Edit the closed-month actual revenue values. Future months use the selected scenario.</p>
          </div>
          <span className="input-count">12 MONTHS</span>
        </div>
        <div className="monthly-table-scroll">
          <table className="monthly-plan-table">
            <thead>
              <tr>
                <th>PERIOD</th>
                <th>REVENUE BUDGET</th>
                <th>ACTUAL / FORECAST</th>
                <th>VARIANCE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {result.monthlyRows.map((row) => (
                <tr key={row.month}>
                  <td className="month-cell">{row.month} 2026</td>
                  <td>{formatCurrency(row.budgetRevenue)}</td>
                  <td>
                    {row.status === "Actual" ? (
                      <label className="actual-revenue-input">
                        <span className="sr-only">Actual revenue for {row.month}</span>
                        <span>€</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={actualRevenue[row.month] ?? 0}
                          onChange={(event) => updateActualRevenue(row.month, event.target.value)}
                          aria-label={`Actual revenue for ${row.month}`}
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
                      <i /> {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Full year</td>
                <td>{formatCurrency(result.budgetRevenue)}</td>
                <td><strong>{formatCurrency(result.projectedRevenue)}</strong></td>
                <td>
                  <span className={`variance-value ${result.revenueVariance >= 0 ? "positive" : "negative"}`}>
                    {result.revenueVariance >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(result.revenueVariance))}
                  </span>
                </td>
                <td><span className="month-status forecast"><i /> Projected</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="planning-profit-panel panel">
        <div className="planning-profit-heading">
          <div className="panel-kicker">FULL-YEAR PROFITABILITY MODEL</div>
          <h2>Projected income statement</h2>
          <p>Annual projection based on actual revenue entered to date and the selected scenario's cost assumptions.</p>
        </div>
        <div className="planning-profit-table">
          <div><span>Projected revenue</span><strong>{formatCurrency(result.projectedRevenue)}</strong></div>
          <div><span>Projected cost of goods sold</span><strong>({formatCurrency(result.projectedCostOfGoodsSold)})</strong></div>
          <div className="profit-subtotal"><span>Projected gross profit</span><strong>{formatCurrency(result.projectedGrossProfit)}</strong></div>
          <div><span>Annual operating expenses</span><strong>({formatCurrency(result.projectedOperatingExpenses)})</strong></div>
          <div className="profit-ebitda"><span>Projected EBITDA</span><strong>{formatCurrency(result.projectedEbitda)}</strong></div>
          <div><span>Depreciation &amp; amortisation</span><strong>({formatCurrency(result.projectedDepreciationAndAmortisation)})</strong></div>
          <div className="profit-subtotal"><span>Projected EBIT</span><strong>{formatCurrency(result.projectedEbit)}</strong></div>
          <div><span>Interest expense</span><strong>({formatCurrency(result.projectedInterestExpense)})</strong></div>
          <div className="profit-subtotal"><span>Projected profit before tax</span><strong>{formatCurrency(result.projectedProfitBeforeTax)}</strong></div>
          <div><span>Modelled income tax</span><strong>({formatCurrency(result.projectedIncomeTax)})</strong></div>
          <div className="profit-net"><span>Projected net income</span><strong>{formatCurrency(result.projectedNetIncome)}</strong></div>
        </div>
      </section>

      <div className="planning-disclaimer">
        <span aria-hidden="true">ⓘ</span>
        <p>
          <strong>Demo model — not company accounts.</strong> January–October revenue values are editable sample actuals. Historical COGS and operating expenses are not entered as actuals; annual EBITDA, EBIT and net income are modelled using the selected scenario assumptions. Replace the illustrative monthly seasonality with company-specific data before using this for decisions.
        </p>
      </div>
    </div>
  );
}
