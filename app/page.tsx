"use client";

import { useMemo, useState } from "react";
import { PlanningWorkspace } from "@/components/planning-workspace";
import {
  calculateFinancials,
  formatCurrency,
  formatPercent,
  type FinancialInputs,
} from "@/domain/financials";

type View = "overview" | "model" | "planning" | "reports";
type InputKey = keyof FinancialInputs;

const DEMO_INPUTS: FinancialInputs = {
  revenue: 248000,
  costOfGoodsSold: 96300,
  operatingExpenses: 88400,
  depreciationAndAmortisation: 12500,
  interestExpense: 4200,
  taxRatePercent: 25,
};

const INPUT_FIELDS: {
  key: InputKey;
  label: string;
  description: string;
  step: number;
  suffix?: string;
}[] = [
  {
    key: "revenue",
    label: "Revenue",
    description: "Sales recognised in the period",
    step: 1000,
  },
  {
    key: "costOfGoodsSold",
    label: "Cost of goods sold",
    description: "Direct costs attributable to sales",
    step: 500,
  },
  {
    key: "operatingExpenses",
    label: "Operating expenses",
    description: "Operating costs, excluding D&A",
    step: 500,
  },
  {
    key: "depreciationAndAmortisation",
    label: "Depreciation & amortisation",
    description: "Non-cash D&A expense",
    step: 100,
  },
  {
    key: "interestExpense",
    label: "Interest expense",
    description: "Financing costs for the period",
    step: 100,
  },
  {
    key: "taxRatePercent",
    label: "Assumed tax rate",
    description: "Applied only to positive pre-tax profit",
    step: 0.5,
    suffix: "%",
  },
];

const TREND = [
  { month: "Feb", revenue: 181, ebitda: 39 },
  { month: "Mar", revenue: 194, ebitda: 43 },
  { month: "Apr", revenue: 203, ebitda: 46 },
  { month: "May", revenue: 219, ebitda: 51 },
  { month: "Jun", revenue: 231, ebitda: 57 },
  { month: "Jul", revenue: 248, ebitda: 63.3 },
];

function Icon({
  name,
  size = 18,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19.5h16" />
          <path d="M6.5 16V11m5 5V5m5 11v-7" />
          <path d="m5 8 5-3 5 4 5-5" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M13.5 3.5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" />
          <path d="M13 3.5V10h7M8 14h8M8 17.5h8" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 3.5v11m0 0 4-4m-4 4-4-4" />
          <path d="M4.5 16.5v3a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13m-5-5 5 5-5 5" />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path d="m3.5 16 6-6 4 3 7-7" />
          <path d="M14.5 6h6v6" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="15" rx="2.5" />
          <path d="M3 9h18m-5 5h2" />
          <path d="M6 5V3.5h12" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
          <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.2 4L19.5 6.5" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="1.5" />
          <path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
      );
  }
}

function TrendChart() {
  const max = 270;
  const points = TREND.map((point, index) => ({
    x: 30 + index * 102,
    revenueY: 190 - (point.revenue / max) * 155,
    ebitdaY: 190 - (point.ebitda / 80) * 155,
  }));
  const revenueLine = points.map((point) => `${point.x},${point.revenueY}`).join(" ");
  const ebitdaLine = points.map((point) => `${point.x},${point.ebitdaY}`).join(" ");
  const revenueArea = `30,190 ${revenueLine} 540,190`;

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        <span><i className="legend-dot revenue-dot" /> Revenue</span>
        <span><i className="legend-dot ebitda-dot" /> EBITDA</span>
        <span className="chart-unit">EUR · thousands</span>
      </div>
      <svg
        className="trend-chart"
        viewBox="0 0 570 220"
        role="img"
        aria-label="Six month revenue and EBITDA trend"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6681e2" />
            <stop offset="100%" stopColor="#6681e2" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[35, 86, 138, 190].map((y) => (
          <line key={y} x1="28" x2="548" y1={y} y2={y} className="chart-gridline" />
        ))}
        <polygon points={revenueArea} className="chart-area" />
        <polyline points={revenueLine} className="revenue-line" />
        <polyline points={ebitdaLine} className="ebitda-line" />
        {points.map((point, index) => (
          <g key={TREND[index].month}>
            <circle cx={point.x} cy={point.revenueY} r="3.5" className="revenue-point" />
            <text x={point.x} y="211" textAnchor="middle" className="chart-month">
              {TREND[index].month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  tone = "blue",
  icon,
}: {
  label: string;
  value: string;
  change: string;
  tone?: "blue" | "green" | "violet" | "amber";
  icon: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}><Icon name={icon} size={17} /></span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <span className="positive-change"><Icon name="trend" size={13} /> {change}</span>
        <span>vs. prior period</span>
      </div>
    </article>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [inputs, setInputs] = useState<FinancialInputs>(DEMO_INPUTS);
  const results = useMemo(() => calculateFinancials(inputs), [inputs]);

  function updateInput(key: InputKey, rawValue: string) {
    const parsed = rawValue === "" ? 0 : Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const upperBound = key === "taxRatePercent" ? 100 : Number.MAX_SAFE_INTEGER;
    setInputs((current) => ({
      ...current,
      [key]: Math.min(upperBound, Math.max(0, parsed)),
    }));
  }

  function exportCsv() {
    const rows = [
      ["EnterpriseOS — Management P&L"],
      ["Reporting period", "FY 2026 · Demo data"],
      ["Currency", "EUR"],
      [],
      ["Line item", "Amount (EUR)", "Formula / basis"],
      ["Revenue", results.revenue.toFixed(2), "Input"],
      ["Cost of goods sold", results.costOfGoodsSold.toFixed(2), "Input"],
      ["Gross profit", results.grossProfit.toFixed(2), "Revenue - COGS"],
      ["Gross margin", results.grossMarginPercent.toFixed(2) + "%", "Gross profit / Revenue"],
      ["Operating expenses", results.operatingExpenses.toFixed(2), "Input, excluding D&A"],
      ["EBITDA", results.ebitda.toFixed(2), "Gross profit - Operating expenses"],
      ["EBITDA margin", results.ebitdaMarginPercent.toFixed(2) + "%", "EBITDA / Revenue"],
      ["Depreciation & amortisation", results.depreciationAndAmortisation.toFixed(2), "Input"],
      ["EBIT", results.ebit.toFixed(2), "EBITDA - D&A"],
      ["Interest expense", results.interestExpense.toFixed(2), "Input"],
      ["Profit before tax", results.profitBeforeTax.toFixed(2), "EBIT - Interest"],
      ["Income tax", results.incomeTax.toFixed(2), "Positive PBT × tax rate"],
      ["Net income", results.netIncome.toFixed(2), "PBT - Income tax"],
      ["Net margin", results.netMarginPercent.toFixed(2) + "%", "Net income / Revenue"],
      [],
      ["Note", "Illustrative management model. Not statutory accounts or tax advice."],
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
    link.download = "enterpriseos-management-pnl.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "model", label: "Financial model", icon: "chart" },
    { id: "planning", label: "Budget & scenarios", icon: "trend" },
    { id: "reports", label: "Reports", icon: "file" },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>e</span></div>
          <div>
            <div className="brand-name">enterprise<span>os</span></div>
            <div className="brand-caption">FINANCIAL WORKSPACE</div>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">AC</div>
          <div className="workspace-copy">
            <strong>Aster & Co.</strong>
            <span>Demo workspace</span>
          </div>
          <span className="switch-chevron">⌄</span>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.id === "model" && <span className="nav-count">01</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="nav-label">TOOLS</div>
        <div className="tool-link">
          <span className="tool-icon"><Icon name="sparkle" size={17} /></span>
          <span>AI assistant</span>
          <span className="soon-label">SOON</span>
        </div>
        <div className="tool-link">
          <span className="tool-icon"><Icon name="wallet" size={17} /></span>
          <span>Data connections</span>
          <span className="soon-label">SOON</span>
        </div>

        <div className="sidebar-spacer" />
        <div className="sidebar-help">
          <div className="help-symbol"><Icon name="info" size={17} /></div>
          <div>
            <strong>Need a hand?</strong>
            <span>Explore the model guide</span>
          </div>
          <Icon name="arrow" size={15} />
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">FT</div>
          <div className="user-copy">
            <strong>Finance team</strong>
            <span>Demo account</span>
          </div>
          <span className="user-menu">···</span>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span><span className="breadcrumb-separator">/</span>
            <strong>{view === "overview" ? "Overview" : view === "model" ? "Financial model" : view === "planning" ? "Budget & scenarios" : "Reports"}</strong>
          </div>
          <div className="topbar-actions">
            <span className="period-pill"><Icon name="clock" size={14} /> FY 2026</span>
            <span className="topbar-divider" />
            <button className="icon-button" aria-label="Workspace information" title="Demo workspace">
              <Icon name="info" size={17} />
            </button>
            <button className="export-button" onClick={exportCsv}>
              <Icon name="download" size={16} /> <span>Export CSV</span>
            </button>
            <div className="topbar-avatar">FT</div>
          </div>
        </header>

        <div className="content-area">
          {view === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">MONDAY, 9 NOVEMBER 2026 <span className="eyebrow-dot" /> FINANCIAL OVERVIEW</div>
                  <h1>Good morning, team <span className="heading-wave">✳</span></h1>
                  <p>Here&apos;s how Aster &amp; Co. is performing across the current reporting period.</p>
                </div>
                <div className="heading-actions">
                  <span className="demo-badge"><i /> SAMPLE DATA</span>
                  <button className="secondary-button" onClick={() => setInputs(DEMO_INPUTS)}>
                    <Icon name="refresh" size={15} /> Reset demo
                  </button>
                </div>
              </div>

              <div className="metrics-grid">
                <MetricCard label="Total revenue" value={formatCurrency(results.revenue, true)} change="+7.4%" tone="blue" icon="wallet" />
                <MetricCard label="EBITDA" value={formatCurrency(results.ebitda, true)} change="+11.2%" tone="green" icon="trend" />
                <MetricCard label="EBITDA margin" value={formatPercent(results.ebitdaMarginPercent)} change="+1.8 pp" tone="violet" icon="chart" />
                <MetricCard label="Net income" value={formatCurrency(results.netIncome, true)} change="+5.6%" tone="amber" icon="building" />
              </div>

              <div className="dashboard-grid">
                <section className="panel performance-panel">
                  <div className="panel-header">
                    <div>
                      <div className="panel-kicker">PERFORMANCE</div>
                      <h2>Revenue &amp; profitability</h2>
                      <p>Six-month operating performance</p>
                    </div>
                    <button className="text-action" onClick={() => setView("model")}>View model <Icon name="arrow" size={14} /></button>
                  </div>
                  <TrendChart />
                  <div className="chart-summary">
                    <div><span>Latest revenue</span><strong>{formatCurrency(results.revenue)}</strong></div>
                    <div><span>Latest EBITDA</span><strong>{formatCurrency(results.ebitda)}</strong></div>
                    <div><span>Net margin</span><strong>{formatPercent(results.netMarginPercent)}</strong></div>
                  </div>
                </section>

                <section className="panel breakdown-panel">
                  <div className="panel-header">
                    <div>
                      <div className="panel-kicker">AT A GLANCE</div>
                      <h2>Profit breakdown</h2>
                      <p>Current period · EUR</p>
                    </div>
                    <span className="tiny-status"><i /> LIVE MODEL</span>
                  </div>
                  <div className="breakdown-list">
                    <div className="breakdown-row"><span>Gross profit</span><strong>{formatCurrency(results.grossProfit)}</strong></div>
                    <div className="breakdown-track"><i style={{ width: `${Math.min(100, Math.max(0, results.grossMarginPercent))}%` }} /></div>
                    <div className="breakdown-row"><span>EBITDA</span><strong>{formatCurrency(results.ebitda)}</strong></div>
                    <div className="breakdown-track green-track"><i style={{ width: `${Math.min(100, Math.max(0, results.ebitdaMarginPercent))}%` }} /></div>
                    <div className="breakdown-row"><span>EBIT</span><strong>{formatCurrency(results.ebit)}</strong></div>
                    <div className="breakdown-track violet-track"><i style={{ width: `${Math.min(100, Math.max(0, results.ebitMarginPercent))}%` }} /></div>
                    <div className="breakdown-row"><span>Net income</span><strong className={results.netIncome < 0 ? "negative-value" : ""}>{formatCurrency(results.netIncome)}</strong></div>
                    <div className="breakdown-track amber-track"><i style={{ width: `${Math.min(100, Math.max(0, results.netMarginPercent))}%` }} /></div>
                  </div>
                  <div className="breakdown-note"><Icon name="info" size={14} /> Margins are calculated against reported revenue.</div>
                </section>
              </div>

              <section className="panel quick-model-panel">
                <div className="quick-model-copy">
                  <div className="panel-kicker">INTERACTIVE WORKSPACE</div>
                  <h2>Your numbers, always connected.</h2>
                  <p>Update six operating assumptions and see every key P&amp;L metric recalculate instantly. No formulas to maintain.</p>
                </div>
                <button className="primary-button" onClick={() => setView("model")}>Open financial model <Icon name="arrow" size={16} /></button>
                <div className="quick-model-decoration"><span>∑</span></div>
              </section>

              <div className="bottom-grid">
                <section className="panel activity-panel">
                  <div className="panel-header">
                    <div><div className="panel-kicker">WORKSPACE ACTIVITY</div><h2>Recent updates</h2></div>
                    <span className="activity-period">This period</span>
                  </div>
                  <div className="activity-row">
                    <span className="activity-icon blue"><Icon name="check" size={15} /></span>
                    <div><strong>Management P&amp;L recalculated</strong><span>Live model · Just now</span></div>
                    <span className="activity-tag">UPDATED</span>
                  </div>
                  <div className="activity-row">
                    <span className="activity-icon violet"><Icon name="file" size={15} /></span>
                    <div><strong>FY 2026 reporting period selected</strong><span>Workspace settings · Demo</span></div>
                    <span className="activity-tag">SYSTEM</span>
                  </div>
                </section>
                <section className="panel integrity-panel">
                  <div className="integrity-icon"><Icon name="check" size={19} /></div>
                  <div><strong>Model is calculating</strong><p>All displayed figures are derived from the current assumptions. Sample data only.</p></div>
                  <span className="integrity-status">READY</span>
                </section>
              </div>
            </>
          )}

          {view === "model" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">WORKSPACE <span className="eyebrow-dot" /> FINANCIAL MODELLING</div>
                  <h1>Management P&amp;L</h1>
                  <p>Change the operating assumptions. The statement and performance metrics update instantly.</p>
                </div>
                <div className="heading-actions">
                  <span className="demo-badge"><i /> SAMPLE DATA</span>
                  <button className="secondary-button" onClick={() => setInputs(DEMO_INPUTS)}><Icon name="refresh" size={15} /> Reset inputs</button>
                </div>
              </div>

              <div className="model-meta-row">
                <div className="model-title"><span className="model-file-icon"><Icon name="file" size={17} /></span><div><strong>Management P&amp;L model</strong><span>FY 2026 · EUR · Annual view</span></div></div>
                <div className="calculation-status"><span className="status-pulse" /> Calculations up to date</div>
              </div>

              <div className="model-layout">
                <section className="panel assumptions-panel">
                  <div className="panel-header">
                    <div><div className="panel-kicker">MODEL INPUTS</div><h2>Operating assumptions</h2><p>Enter values for the reporting period.</p></div>
                    <span className="input-count">06 INPUTS</span>
                  </div>
                  <div className="assumption-fields">
                    {INPUT_FIELDS.map((field, index) => (
                      <label className="assumption-field" key={field.key}>
                        <span className="field-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="field-main"><strong>{field.label}</strong><small>{field.description}</small></span>
                        <span className="input-wrap">
                          <span className="input-prefix">{field.suffix ? "" : "€"}</span>
                          <input
                            aria-label={field.label}
                            type="number"
                            min="0"
                            max={field.key === "taxRatePercent" ? 100 : undefined}
                            step={field.step}
                            value={inputs[field.key]}
                            onChange={(event) => updateInput(field.key, event.target.value)}
                          />
                          {field.suffix && <span className="input-suffix">{field.suffix}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="assumptions-footnote"><Icon name="info" size={14} /> Expenses are entered as positive values. D&amp;A is excluded from operating expenses.</div>
                </section>

                <section className="panel statement-panel">
                  <div className="panel-header">
                    <div><div className="panel-kicker">CALCULATED OUTPUT</div><h2>Income statement</h2><p>Amounts in EUR</p></div>
                    <span className="live-badge"><i /> LIVE</span>
                  </div>
                  <div className="statement-table">
                    <div className="statement-head"><span>LINE ITEM</span><span>FY 2026</span></div>
                    <div className="statement-row"><span>Revenue</span><strong>{formatCurrency(results.revenue)}</strong></div>
                    <div className="statement-row muted-row"><span>Cost of goods sold</span><span>({formatCurrency(results.costOfGoodsSold)})</span></div>
                    <div className="statement-row subtotal"><span>Gross profit</span><strong>{formatCurrency(results.grossProfit)}</strong></div>
                    <div className="statement-margin"><span>Gross margin</span><span>{formatPercent(results.grossMarginPercent)}</span></div>
                    <div className="statement-row muted-row"><span>Operating expenses</span><span>({formatCurrency(results.operatingExpenses)})</span></div>
                    <div className="statement-row key-row"><span>EBITDA</span><strong>{formatCurrency(results.ebitda)}</strong></div>
                    <div className="statement-margin"><span>EBITDA margin</span><span>{formatPercent(results.ebitdaMarginPercent)}</span></div>
                    <div className="statement-row muted-row"><span>Depreciation &amp; amortisation</span><span>({formatCurrency(results.depreciationAndAmortisation)})</span></div>
                    <div className="statement-row subtotal"><span>EBIT</span><strong>{formatCurrency(results.ebit)}</strong></div>
                    <div className="statement-margin"><span>EBIT margin</span><span>{formatPercent(results.ebitMarginPercent)}</span></div>
                    <div className="statement-row muted-row"><span>Interest expense</span><span>({formatCurrency(results.interestExpense)})</span></div>
                    <div className="statement-row subtotal"><span>Profit before tax</span><strong>{formatCurrency(results.profitBeforeTax)}</strong></div>
                    <div className="statement-row muted-row"><span>Income tax</span><span>({formatCurrency(results.incomeTax)})</span></div>
                    <div className="statement-row final-row"><span>Net income</span><strong className={results.netIncome < 0 ? "negative-value" : ""}>{formatCurrency(results.netIncome)}</strong></div>
                    <div className="statement-margin final-margin"><span>Net margin</span><span>{formatPercent(results.netMarginPercent)}</span></div>
                  </div>
                  <button className="statement-export" onClick={exportCsv}><Icon name="download" size={15} /> Download statement (CSV)</button>
                </section>
              </div>

              <div className="formula-note">
                <div className="formula-note-icon">ƒx</div>
                <div><strong>Transparent calculations</strong><p>EBITDA = Revenue − COGS − Operating expenses. EBIT = EBITDA − D&amp;A. Net income = Profit before tax − income tax. Tax is applied only to positive pre-tax profit.</p></div>
              </div>
            </>
          )}

          {view === "planning" && <PlanningWorkspace />}

          {view === "reports" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">WORKSPACE <span className="eyebrow-dot" /> REPORTING</div>
                  <h1>Reports &amp; exports</h1>
                  <p>Download a structured view of the current management model.</p>
                </div>
                <div className="heading-actions"><span className="demo-badge"><i /> SAMPLE DATA</span></div>
              </div>
              <section className="panel report-feature">
                <div className="report-feature-icon"><Icon name="file" size={23} /></div>
                <div className="report-feature-copy">
                  <div className="panel-kicker">AVAILABLE REPORT</div>
                  <h2>Management profit &amp; loss</h2>
                  <p>A detailed P&amp;L statement with formulas, margins and model assumptions for FY 2026.</p>
                  <div className="report-tags"><span>CSV format</span><span>EUR currency</span><span>Live values</span></div>
                </div>
                <button className="primary-button" onClick={exportCsv}><Icon name="download" size={16} /> Export report</button>
              </section>
              <div className="report-summary-grid">
                <MetricCard label="Revenue" value={formatCurrency(results.revenue, true)} change="Current model" tone="blue" icon="wallet" />
                <MetricCard label="EBITDA" value={formatCurrency(results.ebitda, true)} change="Current model" tone="green" icon="trend" />
                <MetricCard label="Net income" value={formatCurrency(results.netIncome, true)} change="Current model" tone="amber" icon="building" />
              </div>
              <div className="report-disclaimer"><Icon name="info" size={17} /><p><strong>Illustrative data only.</strong> This MVP does not produce statutory accounts, audited statements or tax filings. Review calculations and accounting policies with a qualified professional before relying on outputs.</p></div>
            </>
          )}

          <footer className="page-footer">
            <span>© 2026 EnterpriseOS</span>
            <span><i /> All systems operational</span>
            <span>Built for clearer business decisions.</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
