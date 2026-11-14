"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { PlanningWorkspace } from "@/components/planning-workspace";
import { ThreeStatementsWorkspace } from "@/components/three-statements-workspace";
import { OperationsWorkspace } from "@/components/operations-workspace";
import { useAuth } from "@/components/auth-provider";
import { canAccessView, minimumPlanForView, PLANS } from "@/lib/plans";
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
  if (typeof window === "undefined") return "es";
  const savedLanguage = window.localStorage.getItem("enterpriseos-language");
  return savedLanguage === "en" || savedLanguage === "es" ? savedLanguage : "es";
}

function getServerLanguageSnapshot(): Language {
  return "es";
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
  const auth = useAuth();
  const [view, setView] = useState<View>("overview");
  const [showWorkspaceInfo, setShowWorkspaceInfo] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [demoAccessGranted, setDemoAccessGranted] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [demoCodeError, setDemoCodeError] = useState("");

  useEffect(() => {
    setDemoAccessGranted(window.sessionStorage.getItem("enterpriseos:demo-access") === "granted");
  }, []);

  function submitDemoAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoCode.trim().toUpperCase() === "ATLAS-DEMO-2026") {
      window.sessionStorage.setItem("enterpriseos:demo-access", "granted");
      setDemoAccessGranted(true);
      setDemoCodeError("");
      return;
    }
    setDemoCodeError("La clave no es correcta. Comprueba el código e inténtalo de nuevo.");
  }
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

  useEffect(() => {
    if (auth.configured && !auth.loading && !auth.user) {
      window.location.replace("/EnterpriseOS/account/");
    }
  }, [auth.configured, auth.loading, auth.user]);
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
    if (auth.configured && auth.plan === "essential") return;
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

  if (auth.configured && auth.loading) {
    return <main className="app-shell"><section className="main-column"><div className="page-heading"><h1>Comprobando acceso…</h1></div></section></main>;
  }

  if (auth.configured && !auth.user) {
    return <main className="app-shell"><section className="main-column"><div className="page-heading"><h1>Redirigiendo al inicio de sesión…</h1></div></section></main>;
  }

  if (auth.configured && auth.user && !auth.plan) {
    return <main className="eos-plan-required"><section><span>ENTERPRISEOS / SUBSCRIPTION</span><h1>Elige tu plan para acceder al workspace.</h1><p>Tu cuenta está autenticada, pero todavía no tiene una suscripción activa.</p><a href="/EnterpriseOS/account/?mode=plans">Ver Essential, Professional y Business</a><button type="button" onClick={() => void auth.signOut()}>Cerrar sesión</button></section></main>;
  }

  if (auth.configured && auth.plan && !canAccessView(auth.plan, view)) {
    const requiredPlan = minimumPlanForView(view);
    return <main className="eos-plan-required"><section><span>FUNCIÓN INCLUIDA EN {PLANS[requiredPlan].name.toUpperCase()}</span><h1>Desbloquea esta área de EnterpriseOS.</h1><p>Tu plan actual es {PLANS[auth.plan].name}. Esta función requiere {PLANS[requiredPlan].name} ({PLANS[requiredPlan].monthlyPrice} €/mes).</p><a href={"/EnterpriseOS/account/?mode=plans&plan=" + requiredPlan}>Mejorar mi plan</a><button type="button" onClick={() => setView("overview")}>Volver al overview</button></section></main>;
  }

  if (!auth.configured && !demoAccessGranted) {
    return (
      <main className="eos-demo-gate">
        <div className="eos-demo-gate-top"><a href="/EnterpriseOS/platform/" className="eos-demo-brand"><span>EO</span> ENTERPRISEOS</a><span className="eos-demo-tag">THE FINANCIAL ATLAS</span></div>
        <section className="eos-demo-gate-card">
          <div className="eos-demo-gate-icon" aria-hidden="true">EO</div>
          <span className="eos-demo-kicker">DEMO WORKSPACE / ACCESS</span>
          <h1>Entra en tu espacio financiero.</h1>
          <p>Introduce la clave de demostración para explorar el workspace interactivo de EnterpriseOS con datos ficticios.</p>
          <form className="eos-demo-form" onSubmit={submitDemoAccess}>
            <label htmlFor="eos-demo-code">Clave de acceso</label>
            <input id="eos-demo-code" type="password" autoComplete="off" value={demoCode} onChange={(event) => { setDemoCode(event.target.value); setDemoCodeError(""); }} placeholder="Introduce tu clave" required />
            <button type="submit">Acceder al workspace <span aria-hidden="true">→</span></button>
          </form>
          {demoCodeError && <p className="eos-demo-error" role="alert">{demoCodeError}</p>}
          <div className="eos-demo-gate-note"><span /> Demo privada de producto <b>·</b> Datos sintéticos <b>·</b> Sin conexión bancaria</div>
          <a className="eos-demo-account-link" href="/EnterpriseOS/account/">¿Ya tienes una cuenta? Iniciar sesión</a>
        </section>
        <footer className="eos-demo-gate-footer"><span>© 2026 ENTERPRISEOS</span><span>FINANCIAL DECISION INTELLIGENCE</span></footer>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark brand-monogram" aria-hidden="true"><span>E</span><i /> </div>
          <div>
            <div className="brand-name">{t("enterprise")}<span>{t("os")}</span></div>
            <div className="brand-caption">{t("FINANCE OPERATING SYSTEM")}</div>
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

        <div className="nav-system">
          <div className="nav-group">
            <div className="nav-group-heading"><span>01</span><strong>{t("EXECUTIVE VIEW")}</strong></div>
            <nav className="primary-nav" aria-label={t("Executive navigation")}>
              <button
                className={`nav-item ${view === "overview" ? "active" : ""}`}
                onClick={() => setView("overview")}
                aria-current={view === "overview" ? "page" : undefined}
              >
                <Icon name="grid" size={18} /><span>{t("Overview")}</span><small>01</small>
              </button>
            </nav>
          </div>
          <div className="nav-group">
            <div className="nav-group-heading"><span>02</span><strong>{t("FINANCE WORKBENCH")}</strong></div>
            <nav className="primary-nav" aria-label={t("Finance navigation")}>
              {([
                { id: "model", label: t("Financial model"), icon: "chart", index: "02.1" },
                { id: "planning", label: t("Budget & scenarios"), icon: "trend", index: "02.2" },
                { id: "statements", label: t("3 statements"), icon: "chart", index: "02.3" },
              ] as { id: View; label: string; icon: string; index: string }[]).map((item) => (
                <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined}>
                  <Icon name={item.icon} size={18} /><span>{item.label}</span><small>{item.index}</small>
                </button>
              ))}
            </nav>
          </div>
          <div className="nav-group">
            <div className="nav-group-heading"><span>03</span><strong>{t("OPERATIONS & INSIGHT")}</strong></div>
            <nav className="primary-nav" aria-label={t("Operations navigation")}>
              {([
                { id: "operations", label: t("Operations & intelligence"), icon: "building", index: "03.1" },
                { id: "reports", label: t("Reports & exports"), icon: "file", index: "03.2" },
              ] as { id: View; label: string; icon: string; index: string }[]).map((item) => (
                <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined}>
                  <Icon name={item.icon} size={18} /><span>{item.label}</span><small>{item.index}</small>
                </button>
              ))}
            </nav>
          </div>
        </div>

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
            <strong>{auth.user?.email ?? t("Finance team")}</strong>
            <span>{auth.plan ? PLANS[auth.plan].name + " · " + PLANS[auth.plan].monthlyPrice + " €/mes" : t("Demo account")}</span>
          </div>
          <button type="button" className="user-menu" onClick={() => void auth.signOut()} aria-label="Cerrar sesión" title="Cerrar sesión">{auth.user ? "Salir" : "···"}</button>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{t("Workspace")}</span><span className="breadcrumb-separator">/</span>
            <strong>{view === "overview" ? t("Overview") : view === "model" ? t("Financial model") : view === "planning" ? t("Budget & scenarios") : view === "statements" ? t("3 statements") : view === "operations" ? t("Operations") : t("Reports")}</strong>
          </div>
          <div className="topbar-actions">
            <Link className="product-overview-link" href="/platform">Product overview <Icon name="arrow" size={13} /></Link>
            <div className="language-switch" role="group" aria-label={t("Language")}>
              <button type="button" className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
              <button type="button" className={language === "es" ? "selected" : ""} onClick={() => setLanguage("es")} aria-pressed={language === "es"}>ES</button>
            </div>
            <span className="period-pill"><Icon name="clock" size={14} /> {t("FY 2026")}</span>
            {auth.plan && <Link className="period-pill" href="/account/?mode=manage" title="Gestionar suscripción">{PLANS[auth.plan].name} · Gestionar</Link>}
            <span className="topbar-divider" />
            <button type="button" className="icon-button" aria-label={t("Workspace information")} title={t("Demo workspace")} onClick={() => setShowWorkspaceInfo(true)}>
              <Icon name="info" size={17} />
            </button>
            {(!auth.configured || (auth.plan && auth.plan !== "essential")) && <button className="export-button" onClick={exportExcel}>
              <Icon name="download" size={16} /> <span>{t("Export Excel")}</span>
            </button>}
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
            <div className="eos-command">
              <header className="eos-command-heading">
                <div className="eos-heading-index"><span>01</span><i /></div>
                <div className="eos-heading-copy">
                  <div className="eyebrow">{t("EXECUTIVE OFFICE")} <span className="eyebrow-dot" /> {t("FY 2026")}</div>
                  <h1>{t("See the business. Understand the numbers. Decide what comes next.")}</h1>
                  <p>{t("A connected management view built around the financial drivers that shape the company.")}</p>
                </div>
                <div className="eos-heading-actions">
                  <span className="eos-period-label">{t("ANNUAL VIEW")} · EUR</span>
                  <button className="primary-button" onClick={() => setView("model")}>{t("Open financial model")} <Icon name="arrow" size={15} /></button>
                  <button className="secondary-button" onClick={() => setInputs(DEMO_INPUTS)}><Icon name="refresh" size={14} /> {t("Reset demo")}</button>
                </div>
              </header>

              <section className="eos-executive-stage" aria-label={t("Executive financial overview")}>
                <div className="eos-stage-performance">
                  <div className="eos-stage-topline">
                    <span className="eos-stage-index">A / 01</span>
                    <span className="eos-stage-kicker">{t("REVENUE PERFORMANCE")}</span>
                    <span className="eos-stage-sample"><i /> {t("ILLUSTRATIVE DATA")}</span>
                  </div>
                  <div className="eos-revenue-heading">
                    <div><span>{t("Revenue recognised")}</span><strong>{formatCurrency(results.revenue, true)}</strong></div>
                    <span className="eos-revenue-unit">{t("FY 2026")}<br />EUR</span>
                  </div>
                  <div className="eos-stage-chart">
                    <TrendChart language={language} />
                  </div>
                  <div className="eos-stage-foot">
                    <span>{t("Six-month illustrative trend")}</span>
                    <span>{t("Revenue")} <b>{formatCurrency(results.revenue, true)}</b></span>
                  </div>
                </div>

                <aside className="eos-stage-bridge">
                  <div className="eos-bridge-heading">
                    <div><span className="eos-bridge-index">A / 02</span><span className="eos-bridge-kicker">{t("PROFITABILITY BRIDGE")}</span></div>
                    <span className="eos-bridge-unit">EUR</span>
                  </div>
                  <h2>{t("Where revenue goes")}</h2>
                  <p>{t("Follow the calculation from sales to the final result.")}</p>
                  <div className="eos-bridge-list">
                    <div className="eos-bridge-row eos-bridge-start"><span>{t("Revenue")}</span><strong>{formatCurrency(results.revenue)}</strong></div>
                    <div className="eos-bridge-row eos-bridge-deduction"><span>{t("Cost of goods sold")}</span><strong>−{formatCurrency(results.costOfGoodsSold)}</strong></div>
                    <div className="eos-bridge-row eos-bridge-subtotal"><span>{t("Gross profit")}</span><strong>{formatCurrency(results.grossProfit)}</strong></div>
                    <div className="eos-bridge-row eos-bridge-deduction"><span>{t("Operating expenses")}</span><strong>−{formatCurrency(results.operatingExpenses)}</strong></div>
                    <div className="eos-bridge-row eos-bridge-key"><span>EBITDA</span><strong>{formatCurrency(results.ebitda)}</strong></div>
                    <div className="eos-bridge-row eos-bridge-deduction"><span>{t("D&A, interest and tax")}</span><strong>−{formatCurrency(results.depreciationAndAmortisation + results.interestExpense + results.incomeTax)}</strong></div>
                    <div className="eos-bridge-row eos-bridge-final"><span>{t("Net income")}</span><strong className={results.netIncome < 0 ? "negative-value" : ""}>{formatCurrency(results.netIncome)}</strong></div>
                  </div>
                  <button className="eos-bridge-link" onClick={() => setView("model")}>{t("Inspect every assumption")} <Icon name="arrow" size={14} /></button>
                </aside>
              </section>

              <section className="eos-margin-section">
                <div className="eos-section-marker"><span>B</span><i /></div>
                <div className="eos-margin-content">
                  <div className="eos-section-heading">
                    <div><span className="eos-section-kicker">{t("MARGIN PROFILE")}</span><h2>{t("How much value does the business retain?")}</h2></div>
                    <span className="eos-section-note">{t("Calculated from the current model")}</span>
                  </div>
                  <div className="eos-margin-grid">
                    <article className="eos-margin-item">
                      <div className="eos-margin-label"><span>{t("Gross margin")}</span><b>01</b></div>
                      <strong>{formatPercent(results.grossMarginPercent)}</strong>
                      <div className="eos-margin-track"><i style={{width:`${Math.max(0,Math.min(100,results.grossMarginPercent))}%`}} /></div>
                      <small>{t("Revenue remaining after direct costs")}</small>
                    </article>
                    <article className="eos-margin-item">
                      <div className="eos-margin-label"><span>{t("EBITDA margin")}</span><b>02</b></div>
                      <strong>{formatPercent(results.ebitdaMarginPercent)}</strong>
                      <div className="eos-margin-track"><i style={{width:`${Math.max(0,Math.min(100,results.ebitdaMarginPercent))}%`}} /></div>
                      <small>{t("Operating earnings before D&A")}</small>
                    </article>
                    <article className="eos-margin-item">
                      <div className="eos-margin-label"><span>{t("Net margin")}</span><b>03</b></div>
                      <strong className={results.netMarginPercent < 0 ? "negative-value" : ""}>{formatPercent(results.netMarginPercent)}</strong>
                      <div className="eos-margin-track"><i className={results.netMarginPercent < 0 ? "is-negative" : ""} style={{width:`${Math.max(0,Math.min(100,Math.abs(results.netMarginPercent)))}%`}} /></div>
                      <small>{t("Final profit retained from revenue")}</small>
                    </article>
                  </div>
                </div>
              </section>

              <section className="eos-workspace-section">
                <div className="eos-section-marker"><span>C</span><i /></div>
                <div className="eos-workspace-content">
                  <div className="eos-section-heading">
                    <div><span className="eos-section-kicker">{t("THE ENTERPRISEOS SYSTEM")}</span><h2>{t("Move from financial insight to execution.")}</h2></div>
                    <span className="eos-section-note">{t("FOUR CONNECTED WORKSPACES")}</span>
                  </div>
                  <div className="eos-workspace-list">
                    <button className="eos-workspace-row" onClick={() => setView("planning")}>
                      <span className="eos-workspace-number">01</span><span className="eos-workspace-glyph"><Icon name="trend" size={19} /></span>
                      <span className="eos-workspace-description"><strong>{t("Planning & scenarios")}</strong><small>{t("Build budgets, test assumptions and compare alternative outcomes.")}</small></span>
                      <span className="eos-workspace-category">{t("PLAN")}</span><Icon name="arrow" size={17} />
                    </button>
                    <button className="eos-workspace-row" onClick={() => setView("statements")}>
                      <span className="eos-workspace-number">02</span><span className="eos-workspace-glyph"><Icon name="chart" size={19} /></span>
                      <span className="eos-workspace-description"><strong>{t("Three-statement model")}</strong><small>{t("Connect profit, balance sheet and cash flow assumptions.")}</small></span>
                      <span className="eos-workspace-category">{t("MODEL")}</span><Icon name="arrow" size={17} />
                    </button>
                    <button className="eos-workspace-row" onClick={() => setView("operations")}>
                      <span className="eos-workspace-number">03</span><span className="eos-workspace-glyph"><Icon name="building" size={19} /></span>
                      <span className="eos-workspace-description"><strong>{t("Business operations")}</strong><small>{t("Manage pipeline, projects, risks, KPIs and cost centres.")}</small></span>
                      <span className="eos-workspace-category">{t("OPERATE")}</span><Icon name="arrow" size={17} />
                    </button>
                    <button className="eos-workspace-row" onClick={() => setView("reports")}>
                      <span className="eos-workspace-number">04</span><span className="eos-workspace-glyph"><Icon name="file" size={19} /></span>
                      <span className="eos-workspace-description"><strong>{t("Reports & exports")}</strong><small>{t("Review and export the current management information.")}</small></span>
                      <span className="eos-workspace-category">{t("REPORT")}</span><Icon name="arrow" size={17} />
                    </button>
                  </div>
                </div>
              </section>

              <footer className="eos-data-note"><span><Icon name="info" size={15} /></span><p><strong>{t("Important data note")}</strong>{t("This version uses illustrative figures and manually entered assumptions. It is a management-planning MVP, not a connected accounting ledger or statutory reporting system.")}</p><span className="eos-data-stamp">{t("MODEL SCOPE")} / 01</span></footer>
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
            <span><i /> {t("Local demo environment")}</span>
            <span>{t("Built for clearer business decisions.")}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
