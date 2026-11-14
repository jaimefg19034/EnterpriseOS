"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PlanningWorkspace } from "@/components/planning-workspace";
import { ThreeStatementsWorkspace } from "@/components/three-statements-workspace";
import { OperationsWorkspace } from "@/components/operations-workspace";
import { translate, type Language } from "@/i18n/translations";
import { downloadExcelWorkbook } from "@/lib/excel-export";
import {
  calculateFinancials,
  formatCurrency,
  formatPercent,
  type FinancialInputs,
} from "@/domain/financials";

type View = "overview" | "model" | "planning" | "statements" | "operations" | "reports";
type InputKey = keyof FinancialInputs;

const LANGUAGE_CHANGE_EVENT = "enterpriseos-language-change";

function subscribeToLanguage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getLanguageSnapshot(): Language {
  return typeof window !== "undefined" && window.localStorage.getItem("enterpriseos-language") === "es" ? "es" : "en";
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

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

function TrendChart({ language }: { language: Language }) {
  const t = (value: string) => translate(value, language);
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
        <span><i className="legend-dot revenue-dot" /> {t("Revenue")}</span>
        <span><i className="legend-dot ebitda-dot" /> {t("EBITDA")}</span>
        <span className="chart-unit">{t("EUR · thousands")}</span>
      </div>
      <svg
        className="trend-chart"
        viewBox="0 0 570 220"
        role="img"
        aria-label={t("Six month revenue and EBITDA trend")}
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
          <g key={t(TREND[index].month)}>
            <circle cx={point.x} cy={point.revenueY} r="3.5" className="revenue-point" />
            <text x={point.x} y="211" textAnchor="middle" className="chart-month">
              {t(TREND[index].month)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function MetricCard({
  label,
  language,
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
  language: Language;
}) {
  const t = (value: string) => translate(value, language);
  return (
    <article className="executive-kpi">
      <div className="metric-topline">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}><Icon name={icon} size={17} /></span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <span className="positive-change"><Icon name="trend" size={13} /> {change}</span>
        <span>{t("vs. prior period")}</span>
      </div>
    </article>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [showWorkspaceInfo, setShowWorkspaceInfo] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );
  const setLanguage = (nextLanguage: Language) => {
    window.localStorage.setItem("enterpriseos-language", nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  };
  const t = (value: string) => translate(value, language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
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

  async function exportExcel() {
    await downloadExcelWorkbook({
      filename: "enterpriseos-management-pnl-fy2026.xlsx",
      sheets: [{
        name: t("Income Statement"),
        title: t("EnterpriseOS — Management P&L"),
        subtitle: t("FY 2026 · EUR · Illustrative management report"),
        headers: [t("Line item"), t("Amount (EUR)"), t("Formula / basis")],
        widths: [34, 20, 48],
        currencyColumns: [2],
        percentLabels: [t("Gross margin"), t("EBITDA margin"), t("Net margin")],
        totalLabels: [t("Gross profit"), "EBITDA", "EBIT", t("Profit before tax"), t("Net income")],
        rows: [
          [t("Revenue"), results.revenue, t("Input")],
          [t("Cost of goods sold"), -results.costOfGoodsSold, t("Input")],
          [t("Gross profit"), results.grossProfit, t("Revenue - COGS")],
          [t("Gross margin"), results.grossMarginPercent / 100, t("Gross profit / Revenue")],
          [t("Operating expenses"), -results.operatingExpenses, t("Input, excluding D&A")],
          ["EBITDA", results.ebitda, t("Gross profit - Operating expenses")],
          [t("EBITDA margin"), results.ebitdaMarginPercent / 100, t("EBITDA / Revenue")],
          [t("Depreciation & amortisation"), -results.depreciationAndAmortisation, t("Input")],
          ["EBIT", results.ebit, t("EBITDA - D&A")],
          [t("Interest expense"), -results.interestExpense, t("Input")],
          [t("Profit before tax"), results.profitBeforeTax, t("EBIT - Interest")],
          [t("Income tax"), -results.incomeTax, t("Positive PBT × tax rate")],
          [t("Net income"), results.netIncome, t("PBT - Income tax")],
          [t("Net margin"), results.netMarginPercent / 100, t("Net income / Revenue")],
        ],
      }],
    });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>{t("e")}</span></div>
          <div>
            <div className="brand-name">{t("enterprise")}<span>{t("os")}</span></div>
            <div className="brand-caption">{t("FINANCIAL WORKSPACE")}</div>
          </div>
        </div>

        <button type="button" className="workspace-switcher" onClick={() => setShowWorkspaceInfo(true)} aria-label={t("Open workspace information")}>
          <div className="workspace-avatar">{t("AC")}</div>
          <div className="workspace-copy">
            <strong>{t("Aster & Co.")}</strong>
            <span>{t("Demo workspace")}</span>
          </div>
          <span className="switch-chevron">⌄</span>
        </button>

        <div className="nav-label">{t("WORKSPACE")}</div>
        <nav className="primary-nav" aria-label={t("Main navigation")}>
          <button
            className={`nav-item ${view === "overview" ? "active" : ""}`}
            onClick={() => setView("overview")}
            aria-current={view === "overview" ? "page" : undefined}
          >
            <Icon name="grid" size={18} /><span>{t("Overview")}</span>
          </button>
          {([
            { id: "model", label: t("Financial model"), icon: "chart" },
            { id: "planning", label: t("Budget & scenarios"), icon: "trend" },
            { id: "statements", label: t("3 statements"), icon: "chart" },
            { id: "reports", label: t("Reports & exports"), icon: "file" },
            { id: "operations", label: t("Operations & intelligence"), icon: "building" },
          ] as { id: View; label: string; icon: string }[]).map((item) => (
            <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="nav-label">{t("TOOLS")}</div>
        <div className="tool-link">
          <span className="tool-icon"><Icon name="sparkle" size={17} /></span>
          <span>{t("AI assistant")}</span>
          <span className="soon-label">{t("SOON")}</span>
        </div>
        <div className="tool-link">
          <span className="tool-icon"><Icon name="wallet" size={17} /></span>
          <span>{t("Data connections")}</span>
          <span className="soon-label">{t("SOON")}</span>
        </div>

        <div className="sidebar-spacer" />
        <button type="button" className="sidebar-help" onClick={() => setShowHelpGuide(true)} aria-haspopup="dialog">
          <div className="help-symbol"><Icon name="info" size={17} /></div>
          <div>
            <strong>{t("Need a hand?")}</strong>
            <span>{t("Explore the model guide")}</span>
          </div>
          <Icon name="arrow" size={15} />
        </button>
        <div className="sidebar-user">
          <div className="user-avatar">{t("FT")}</div>
          <div className="user-copy">
            <strong>{t("Finance team")}</strong>
            <span>{t("Demo account")}</span>
          </div>
          <span className="user-menu">···</span>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{t("Workspace")}</span><span className="breadcrumb-separator">/</span>
            <strong>{view === "overview" ? t("Overview") : view === "model" ? t("Financial model") : view === "planning" ? t("Budget & scenarios") : view === "statements" ? t("3 statements") : view === "operations" ? t("Operations") : t("Reports")}</strong>
          </div>
          <div className="topbar-actions">
            <div className="language-switch" role="group" aria-label={t("Language")}>
              <button type="button" className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
              <button type="button" className={language === "es" ? "selected" : ""} onClick={() => setLanguage("es")} aria-pressed={language === "es"}>ES</button>
            </div>
            <span className="period-pill"><Icon name="clock" size={14} /> {t("FY 2026")}</span>
            <span className="topbar-divider" />
            <button type="button" className="icon-button" aria-label={t("Workspace information")} title={t("Demo workspace")} onClick={() => setShowWorkspaceInfo(true)}>
              <Icon name="info" size={17} />
            </button>
            <button className="export-button" onClick={exportExcel}>
              <Icon name="download" size={16} /> <span>{t("Export Excel")}</span>
            </button>
            <div className="topbar-avatar">{t("FT")}</div>
          </div>
        </header>

        {showWorkspaceInfo && (
          <div className="workspace-info-backdrop">
            <section className="workspace-info-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-info-title">
              <div className="workspace-info-topline">
                <span className="workspace-info-icon"><Icon name="building" size={19} /></span>
                <button type="button" className="workspace-info-close" onClick={() => setShowWorkspaceInfo(false)} aria-label={t("Close")}>×</button>
              </div>
              <div className="panel-kicker">{t("WORKSPACE INFORMATION")}</div>
              <h2 id="workspace-info-title">{t("Aster & Co.")}</h2>
              <p>{t("Demo workspace")}</p>
              <div className="workspace-info-details">
                <div><span>{t("Reporting period")}</span><strong>{t("FY 2026")}</strong></div>
                <div><span>{t("Currency")}</span><strong>EUR (€)</strong></div>
                <div><span>{t("Data status")}</span><strong>{t("Illustrative sample data")}</strong></div>
              </div>
              <p className="workspace-info-note">{t("This is a local demonstration workspace. Changes are not saved to a company database yet.")}</p>
              <button type="button" className="primary-button workspace-info-confirm" onClick={() => setShowWorkspaceInfo(false)}>{t("Got it")}</button>
            </section>
          </div>
        )}

        {showHelpGuide && (
          <div className="workspace-info-backdrop help-guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelpGuide(false); }}>
            <section className="workspace-info-dialog help-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="help-guide-title">
              <div className="workspace-info-topline">
                <span className="workspace-info-icon"><Icon name="sparkle" size={19} /></span>
                <button type="button" className="workspace-info-close" onClick={() => setShowHelpGuide(false)} aria-label={t("Close")}>×</button>
              </div>
              <div className="panel-kicker">{t("ENTERPRISEOS QUICK GUIDE")}</div>
              <h2 id="help-guide-title">{t("A clearer view of your business.")}</h2>
              <p>{t("Choose a workspace to understand what it shows and how to use it.")}</p>
              <div className="help-guide-list">
                <button type="button" onClick={() => { setView("overview"); setShowHelpGuide(false); }}><span className="help-guide-number">01</span><span><strong>{t("Overview")}</strong><small>{t("Monitor revenue, EBITDA, margins and the main performance trends.")}</small></span><Icon name="arrow" size={16} /></button>
                <button type="button" onClick={() => { setView("model"); setShowHelpGuide(false); }}><span className="help-guide-number">02</span><span><strong>{t("Financial model")}</strong><small>{t("Edit the six operating assumptions and see the income statement recalculate.")}</small></span><Icon name="arrow" size={16} /></button>
                <button type="button" onClick={() => { setView("planning"); setShowHelpGuide(false); }}><span className="help-guide-number">03</span><span><strong>{t("Budget & scenarios")}</strong><small>{t("Compare the plan with actuals and explore Base, Upside and Downside cases.")}</small></span><Icon name="arrow" size={16} /></button>
                <button type="button" onClick={() => { setView("statements"); setShowHelpGuide(false); }}><span className="help-guide-number">04</span><span><strong>{t("3 statements")}</strong><small>{t("Review the three statements, liquidity, leverage, break-even, returns, receivables, payables and the quarterly cash forecast.")}</small></span><Icon name="arrow" size={16} /></button>
                <button type="button" onClick={() => { setView("reports"); setShowHelpGuide(false); }}><span className="help-guide-number">05</span><span><strong>{t("Reports")}</strong><small>{t("Export the current model and planning outputs to Excel.")}</small></span><Icon name="arrow" size={16} /></button>
              </div>
              <p className="help-guide-footnote">{t("Tip: use the EN / ES switch in the top bar to change the interface language. This demo uses illustrative figures.")}</p>
              <button type="button" className="primary-button workspace-info-confirm" onClick={() => setShowHelpGuide(false)}>{t("Close guide")}</button>
            </section>
          </div>
        )}

        <div className="content-area">
          {view === "overview" && (
            <div className="command-center">
              <section className="command-hero">
                <div className="command-hero-copy">
                  <div className="eyebrow">{t("FINANCE COMMAND CENTRE")} <span className="eyebrow-dot" /> {t("FY 2026")}</div>
                  <h1>{t("The business, in one view.")}</h1>
                  <p>{t("A decision-ready view of performance, profitability and the assumptions behind the numbers.")}</p>
                  <div className="command-hero-meta"><span className="demo-badge"><i /> {t("ILLUSTRATIVE WORKSPACE")}</span><span>{t("Aster & Co. · EUR")}</span></div>
                </div>
                <div className="command-hero-actions">
                  <button className="primary-button" onClick={() => setView("model")}>{t("Edit financial model")} <Icon name="arrow" size={16} /></button>
                  <button className="secondary-button" onClick={() => setInputs(DEMO_INPUTS)}><Icon name="refresh" size={15} /> {t("Reset demo")}</button>
                </div>
              </section>

              <section className="command-kpi-strip" aria-label={t("Financial performance summary")}>
                <article className="command-kpi command-kpi-primary">
                  <span>{t("Revenue")}</span><strong>{formatCurrency(results.revenue, true)}</strong>
                  <small>{t("Reported period")}</small>
                </article>
                <article className="command-kpi">
                  <span>{t("Gross profit")}</span><strong>{formatCurrency(results.grossProfit, true)}</strong>
                  <small>{formatPercent(results.grossMarginPercent)} {t("gross margin")}</small>
                </article>
                <article className="command-kpi">
                  <span>{t("EBITDA")}</span><strong>{formatCurrency(results.ebitda, true)}</strong>
                  <small>{formatPercent(results.ebitdaMarginPercent)} {t("EBITDA margin")}</small>
                </article>
                <article className="command-kpi">
                  <span>{t("Net income")}</span><strong className={results.netIncome < 0 ? "negative-value" : ""}>{formatCurrency(results.netIncome, true)}</strong>
                  <small>{formatPercent(results.netMarginPercent)} {t("net margin")}</small>
                </article>
              </section>

              <div className="command-main-grid">
                <section className="panel command-performance">
                  <div className="command-section-heading">
                    <div><div className="panel-kicker">{t("PERFORMANCE INTELLIGENCE")}</div><h2>{t("Revenue & operating performance")}</h2><p>{t("Six-month trend alongside the live management model.")}</p></div>
                    <button className="text-action" onClick={() => setView("model")}>{t("Open model")} <Icon name="arrow" size={14} /></button>
                  </div>
                  <TrendChart language={language} />
                  <div className="command-chart-foot">
                    <div><span>{t("Current EBITDA")}</span><strong>{formatCurrency(results.ebitda)}</strong></div>
                    <div><span>{t("Operating cost base")}</span><strong>{formatCurrency(results.costOfGoodsSold + results.operatingExpenses + results.depreciationAndAmortisation)}</strong></div>
                    <div><span>{t("Net result")}</span><strong className={results.netIncome < 0 ? "negative-value" : ""}>{formatCurrency(results.netIncome)}</strong></div>
                  </div>
                </section>

                <aside className="command-side-stack">
                  <section className="panel command-profit-panel">
                    <div className="panel-kicker">{t("PROFITABILITY BRIDGE")}</div>
                    <h2>{t("From sales to net result")}</h2>
                    <div className="command-profit-rows">
                      <div><span>{t("Revenue")}</span><strong>{formatCurrency(results.revenue)}</strong></div>
                      <div><span>{t("Gross profit")}</span><strong>{formatCurrency(results.grossProfit)}</strong></div>
                      <div><span>{t("EBITDA")}</span><strong>{formatCurrency(results.ebitda)}</strong></div>
                      <div><span>{t("EBIT")}</span><strong>{formatCurrency(results.ebit)}</strong></div>
                      <div className="command-profit-total"><span>{t("Net income")}</span><strong className={results.netIncome < 0 ? "negative-value" : ""}>{formatCurrency(results.netIncome)}</strong></div>
                    </div>
                    <button className="text-action" onClick={() => setView("model")}>{t("Inspect calculations")} <Icon name="arrow" size={14} /></button>
                  </section>
                  <section className="command-model-status">
                    <span className="command-status-icon"><Icon name="check" size={18} /></span>
                    <div><strong>{t("Model recalculates live")}</strong><p>{t("Displayed results are derived from the six editable operating assumptions.")}</p></div>
                  </section>
                </aside>
              </div>

              <section className="command-workspaces">
                <div className="command-section-heading">
                  <div><div className="panel-kicker">{t("WORKING AREAS")}</div><h2>{t("Move from insight to action")}</h2><p>{t("Open a dedicated workspace to plan, test and manage the business.")}</p></div>
                </div>
                <div className="command-workspace-grid">
                  <button className="command-workspace-card" onClick={() => setView("planning")}><span className="command-workspace-icon"><Icon name="trend" size={19} /></span><span className="command-workspace-copy"><strong>{t("Budget & scenarios")}</strong><small>{t("Build a plan, compare scenarios and track actuals.")}</small></span><Icon name="arrow" size={16} /></button>
                  <button className="command-workspace-card" onClick={() => setView("statements")}><span className="command-workspace-icon"><Icon name="chart" size={19} /></span><span className="command-workspace-copy"><strong>{t("Three financial statements")}</strong><small>{t("Connect profit, balance sheet and cash flow assumptions.")}</small></span><Icon name="arrow" size={16} /></button>
                  <button className="command-workspace-card" onClick={() => setView("operations")}><span className="command-workspace-icon"><Icon name="building" size={19} /></span><span className="command-workspace-copy"><strong>{t("Business operations")}</strong><small>{t("Track projects, pipeline, risks, KPIs and cost centres.")}</small></span><Icon name="arrow" size={16} /></button>
                  <button className="command-workspace-card" onClick={() => setView("reports")}><span className="command-workspace-icon"><Icon name="file" size={19} /></span><span className="command-workspace-copy"><strong>{t("Reports & exports")}</strong><small>{t("Prepare and export the current management view.")}</small></span><Icon name="arrow" size={16} /></button>
                </div>
              </section>

              <div className="command-disclaimer"><Icon name="info" size={16} /><p><strong>{t("Data scope")}</strong> {t("This workspace currently uses illustrative sample figures. It is a management-planning MVP, not a connected accounting ledger or statutory reporting system.")}</p></div>
            </div>
          )}

          {view === "model" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">{t("WORKSPACE")} <span className="eyebrow-dot" /> {t("FINANCIAL MODELLING")}</div>
                  <h1>{t("Management P&L")}</h1>
                  <p>{t("Change the operating assumptions. The statement and performance metrics update instantly.")}</p>
                </div>
                <div className="heading-actions">
                  <span className="demo-badge"><i /> {t("SAMPLE DATA")}</span>
                  <button className="secondary-button" onClick={() => setInputs(DEMO_INPUTS)}><Icon name="refresh" size={15} /> {t("Reset inputs")}</button>
                </div>
              </div>

              <div className="model-meta-row">
                <div className="model-title"><span className="model-file-icon"><Icon name="file" size={17} /></span><div><strong>{t("Management P&L model")}</strong><span>{t("FY 2026 · EUR · Annual view")}</span></div></div>
                <div className="calculation-status"><span className="status-pulse" /> {t("Calculations up to date")}</div>
              </div>

              <div className="model-layout">
                <section className="panel assumptions-panel">
                  <div className="panel-header">
                    <div><div className="panel-kicker">{t("MODEL INPUTS")}</div><h2>{t("Operating assumptions")}</h2><p>{t("Enter values for the reporting period.")}</p></div>
                    <span className="input-count">{t("06 INPUTS")}</span>
                  </div>
                  <div className="assumption-fields">
                    {INPUT_FIELDS.map((field, index) => (
                      <label className="assumption-field" key={field.key}>
                        <span className="field-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="field-main"><strong>{t(field.label)}</strong><small>{t(field.description)}</small></span>
                        <span className="input-wrap">
                          <span className="input-prefix">{field.suffix ? "" : "€"}</span>
                          <input
                            aria-label={t(field.label)}
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
                  <div className="assumptions-footnote"><Icon name="info" size={14} /> {t("Expenses are entered as positive values. D&A is excluded from operating expenses.")}</div>
                </section>

                <section className="panel statement-panel">
                  <div className="panel-header">
                    <div><div className="panel-kicker">{t("CALCULATED OUTPUT")}</div><h2>{t("Income statement")}</h2><p>{t("Amounts in EUR")}</p></div>
                    <span className="live-badge"><i /> {t("LIVE")}</span>
                  </div>
                  <div className="statement-table">
                    <div className="statement-head"><span>{t("LINE ITEM")}</span><span>{t("FY 2026")}</span></div>
                    <div className="statement-row"><span>{t("Revenue")}</span><strong>{formatCurrency(results.revenue)}</strong></div>
                    <div className="statement-row muted-row"><span>{t("Cost of goods sold")}</span><span>({formatCurrency(results.costOfGoodsSold)})</span></div>
                    <div className="statement-row subtotal"><span>{t("Gross profit")}</span><strong>{formatCurrency(results.grossProfit)}</strong></div>
                    <div className="statement-margin"><span>{t("Gross margin")}</span><span>{formatPercent(results.grossMarginPercent)}</span></div>
                    <div className="statement-row muted-row"><span>{t("Operating expenses")}</span><span>({formatCurrency(results.operatingExpenses)})</span></div>
                    <div className="statement-row key-row"><span>{t("EBITDA")}</span><strong>{formatCurrency(results.ebitda)}</strong></div>
                    <div className="statement-margin"><span>{t("EBITDA margin")}</span><span>{formatPercent(results.ebitdaMarginPercent)}</span></div>
                    <div className="statement-row muted-row"><span>{t("Depreciation & amortisation")}</span><span>({formatCurrency(results.depreciationAndAmortisation)})</span></div>
                    <div className="statement-row subtotal"><span>{t("EBIT")}</span><strong>{formatCurrency(results.ebit)}</strong></div>
                    <div className="statement-margin"><span>{t("EBIT margin")}</span><span>{formatPercent(results.ebitMarginPercent)}</span></div>
                    <div className="statement-row muted-row"><span>{t("Interest expense")}</span><span>({formatCurrency(results.interestExpense)})</span></div>
                    <div className="statement-row subtotal"><span>{t("Profit before tax")}</span><strong>{formatCurrency(results.profitBeforeTax)}</strong></div>
                    <div className="statement-row muted-row"><span>{t("Income tax")}</span><span>({formatCurrency(results.incomeTax)})</span></div>
                    <div className="statement-row final-row"><span>{t("Net income")}</span><strong className={results.netIncome < 0 ? "negative-value" : ""}>{formatCurrency(results.netIncome)}</strong></div>
                    <div className="statement-margin final-margin"><span>{t("Net margin")}</span><span>{formatPercent(results.netMarginPercent)}</span></div>
                  </div>
                  <button className="statement-export" onClick={exportExcel}><Icon name="download" size={15} /> {t("Download statement (Excel)")}</button>
                </section>
              </div>

              <div className="formula-note">
                <div className="formula-note-icon">{t("ƒx")}</div>
                <div><strong>{t("Transparent calculations")}</strong><p>{t("EBITDA = Revenue − COGS − Operating expenses. EBIT = EBITDA − D&A. Net income = Profit before tax − income tax. Tax is applied only to positive pre-tax profit.")}</p></div>
              </div>
            </>
          )}

          {view === "planning" && <PlanningWorkspace language={language} />}

          {view === "statements" && <ThreeStatementsWorkspace financials={results} language={language} />}

          {view === "operations" && <OperationsWorkspace language={language} />}

          {view === "reports" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">{t("WORKSPACE")} <span className="eyebrow-dot" /> {t("REPORTING")}</div>
                  <h1>{t("Reports & exports")}</h1>
                  <p>{t("Download a structured view of the current management model.")}</p>
                </div>
                <div className="heading-actions"><span className="demo-badge"><i /> {t("SAMPLE DATA")}</span></div>
              </div>
              <section className="panel report-feature">
                <div className="report-feature-icon"><Icon name="file" size={23} /></div>
                <div className="report-feature-copy">
                  <div className="panel-kicker">{t("AVAILABLE REPORT")}</div>
                  <h2>{t("Management profit & loss")}</h2>
                  <p>{t("A detailed P&L statement with formulas, margins and model assumptions for FY 2026.")}</p>
                  <div className="report-tags"><span>{t("Excel workbook")}</span><span>{t("EUR currency")}</span><span>{t("Live values")}</span></div>
                </div>
                <button className="primary-button" onClick={exportExcel}><Icon name="download" size={16} /> {t("Export report")}</button>
              </section>
              <div className="report-summary-grid">
                <MetricCard label={t("Revenue")} value={formatCurrency(results.revenue, true)} change={t("Current model")} tone="blue" icon="wallet" language={language} />
                <MetricCard label={t("EBITDA")} value={formatCurrency(results.ebitda, true)} change={t("Current model")} tone="green" icon="trend" language={language} />
                <MetricCard label={t("Net income")} value={formatCurrency(results.netIncome, true)} change={t("Current model")} tone="amber" icon="building" language={language} />
              </div>
              <div className="report-disclaimer"><Icon name="info" size={17} /><p><strong>{t("Illustrative data only.")}</strong> {t("This MVP does not produce statutory accounts, audited statements or tax filings. Review calculations and accounting policies with a qualified professional before relying on outputs.")}</p></div>
            </>
          )}

          <footer className="page-footer">
            <span>{t("© 2026 EnterpriseOS")}</span>
            <span><i /> {t("All systems operational")}</span>
            <span>{t("Built for clearer business decisions.")}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
