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

function subscribeDemoAccess(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("enterpriseos-demo-access-change", onStoreChange);
  return () => window.removeEventListener("enterpriseos-demo-access-change", onStoreChange);
}

function getDemoAccessSnapshot() {
  return window.sessionStorage.getItem("enterpriseos:demo-access") === "granted";
}

function getServerDemoAccessSnapshot() {
  return false;
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
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
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
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [activityOpen, setActivityOpen] = useState(false);
  const [recentViews, setRecentViews] = useState<View[]>([]);
  const demoAccessGranted = useSyncExternalStore(subscribeDemoAccess, getDemoAccessSnapshot, getServerDemoAccessSnapshot);
  const [demoCode, setDemoCode] = useState("");
  const [demoCodeError, setDemoCodeError] = useState("");

  function submitDemoAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoCode.trim().toUpperCase() === "ATLAS-DEMO-2026") {
      window.sessionStorage.setItem("enterpriseos:demo-access", "granted");
      window.dispatchEvent(new Event("enterpriseos-demo-access-change"));
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
  const commandItems: { label: string; detail: string; run: () => void }[] = [
    { label: t("Overview"), detail: "01 · Executive view", run: () => setView("overview") },
    { label: t("Financial model"), detail: "02.1 · Management P&L", run: () => setView("model") },
    { label: t("Budget & scenarios"), detail: "02.2 · Planning", run: () => setView("planning") },
    { label: t("3 statements"), detail: "02.3 · Financial statements", run: () => setView("statements") },
    { label: t("Operations & intelligence"), detail: "03.1 · Operations", run: () => setView("operations") },
    { label: t("Reports & exports"), detail: "03.2 · Reporting", run: () => setView("reports") },
    { label: t("Reset demo"), detail: "Restore illustrative model assumptions", run: () => { setInputs(DEMO_INPUTS); setView("overview"); } },
    { label: t("Export Excel"), detail: "Download current management P&L", run: () => { void exportExcel(); } },
  ];
  const filteredCommands = commandItems.filter((item) => (item.label + " " + item.detail).toLowerCase().includes(commandQuery.toLowerCase()));
  const viewLabels: Record<View, string> = { overview: t("Overview"), model: t("Financial model"), planning: t("Budget & scenarios"), statements: t("3 statements"), operations: t("Operations & intelligence"), reports: t("Reports & exports") };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem("enterpriseos:recent-views") ?? "[]");
        if (Array.isArray(saved)) setRecentViews(saved.filter((item): item is View => ["overview","model","planning","statements","operations","reports"].includes(item)).slice(0, 8));
      } catch { setRecentViews([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecentViews((current) => {
        const next = [view, ...current.filter((item) => item !== view)].slice(0, 8);
        try { window.localStorage.setItem("enterpriseos:recent-views", JSON.stringify(next)); } catch { /* Recent navigation is an optional convenience. */ }
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [view]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    function handleCommandShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (target.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(target.tagName));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setCommandOpen((open) => !open); setCommandQuery(""); setCommandIndex(0);
      } else if (event.key === "/" && !isTyping) {
        event.preventDefault(); setCommandOpen(true); setCommandQuery(""); setCommandIndex(0);
      }
      if (event.key === "Escape") { setCommandOpen(false); setActivityOpen(false); }
    }
    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

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
          <div className="brand-mark brand-vector" aria-hidden="true"><svg viewBox="0 0 40 40" role="img"><path d="M20 3.5 35.5 12.4v15.2L20 36.5 4.5 27.6V12.4L20 3.5Z" /><path d="M12 12.5h16M12 20h12M12 27.5h16M28 12.5v15" /></svg></div>
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
            <button type="button" className="command-launcher" onClick={() => { setCommandOpen(true); setCommandQuery(""); setCommandIndex(0); }} aria-label={t("Open command menu")}>
              <Icon name="search" size={14} /><span>{t("Quick command")}</span><kbd>⌘ K</kbd>
            </button>
            <button type="button" className="activity-launcher" onClick={() => setActivityOpen(true)} aria-label={t("Open recent activity")}><Icon name="clock" size={15} /><span>{t("Recent")}</span></button>
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

        <div className="content-area" data-view={view}>
          <section className="workspace-utility-rail" aria-label={t("Workspace controls")}>
            <div className="utility-status"><span className="utility-pulse" /><div><strong>{t("LOCAL MODEL ENGINE")}</strong><small>{t("READY · SYNCHRONOUS CALCULATIONS")}</small></div></div>
            <div className="utility-metric"><span>{t("REVENUE MODEL")}</span><strong>{formatCurrency(results.revenue, true)}</strong></div>
            <div className="utility-metric"><span>EBITDA</span><strong>{formatCurrency(results.ebitda, true)}</strong></div>
            <div className="utility-metric"><span>{t("INPUTS")}</span><strong>06 / 06</strong></div>
            <div className="utility-actions">
              <button type="button" onClick={() => setView("model")}>{t("Edit model")} <Icon name="arrow" size={13} /></button>
              <button type="button" onClick={() => setView("reports")}>{t("Reports")} <Icon name="file" size={13} /></button>
            </div>
          </section>
          {activityOpen && (
            <div className="workspace-info-backdrop activity-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setActivityOpen(false); }}>
              <section className="activity-drawer" role="dialog" aria-modal="true" aria-labelledby="activity-drawer-title">
                <header><div><span className="panel-kicker">{t("WORKSPACE HISTORY")}</span><h2 id="activity-drawer-title">{t("Recently opened")}</h2><p>{t("Your recent navigation on this device.")}</p></div><button type="button" onClick={() => setActivityOpen(false)} aria-label={t("Close")}>×</button></header>
                <div className="activity-list">{recentViews.map((item, index) => <button type="button" key={item} onClick={() => { setView(item); setActivityOpen(false); }}><span className="activity-index">{String(index + 1).padStart(2,"0")}</span><span><strong>{viewLabels[item]}</strong><small>{index === 0 ? t("Most recent") : t("Opened on this device")}</small></span><Icon name="arrow" size={15}/></button>)}{recentViews.length === 0 && <p className="activity-empty">{t("Your recently opened workspaces will appear here.")}</p>}</div>
                <footer><span>{t("Stored locally in this browser")}</span><button type="button" onClick={() => { setRecentViews([]); try { window.localStorage.removeItem("enterpriseos:recent-views"); } catch { /* Ignore unavailable storage. */ } }}>{t("Clear history")}</button></footer>
              </section>
            </div>
          )}
          {commandOpen && (
            <div className="command-palette-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
              <section className="command-palette" role="dialog" aria-modal="true" aria-label={t("Quick command")}>
                <div className="command-palette-search"><Icon name="search" size={18} /><input autoFocus value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setCommandIndex((current) => Math.min(filteredCommands.length - 1, current + 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setCommandIndex((current) => Math.max(0, current - 1)); } else if (event.key === "Enter" && filteredCommands[commandIndex]) { event.preventDefault(); filteredCommands[commandIndex].run(); setCommandOpen(false); } }} placeholder={t("Search workspaces and actions…")} /><kbd>ESC</kbd></div>
                <div className="command-palette-label">{t("NAVIGATION & ACTIONS")}</div>
                <div className="command-palette-results">
                  {filteredCommands.map((item, index) => <button type="button" key={item.label} className={index === commandIndex ? "is-selected" : ""} onMouseEnter={() => setCommandIndex(index)} onClick={() => { item.run(); setCommandOpen(false); }}><span><strong>{item.label}</strong><small>{item.detail}</small></span><Icon name="arrow" size={15} /></button>)}
                  {filteredCommands.length === 0 && <p className="command-palette-empty">{t("No matching command. Try another search.")}</p>}
                </div>
                <footer><span><kbd>↑</kbd><kbd>↓</kbd> {t("Navigate")}</span><span><kbd>↵</kbd> {t("Select action")}</span><span><kbd>/</kbd> {t("Search")}</span></footer>
              </section>
            </div>
          )}
          {view === "overview" && (
            <div className="overview-v2">
              <header className="overview-v2-header">
                <div><div className="eyebrow">{t("EXECUTIVE OFFICE")} <span className="eyebrow-dot" /> {t("FY 2026")} <span className="overview-v2-live">ILLUSTRATIVE MODEL</span></div><h1>{t("Executive overview")}</h1><p>{t("A connected management view built around the financial drivers that shape the company.")}</p></div>
                <div className="overview-v2-actions"><button className="primary-button" onClick={() => setView("model")}>{t("Open financial model")} <Icon name="arrow" size={15} /></button><button className="secondary-button" onClick={() => setInputs(DEMO_INPUTS)}><Icon name="refresh" size={14} /> {t("Reset demo")}</button></div>
              </header>
              <section className="overview-v2-kpis" aria-label={t("Key financial indicators")}>
                <article className="overview-v2-kpi overview-v2-kpi-primary"><span>{t("Revenue")}</span><strong>{formatCurrency(results.revenue,true)}</strong><small>{t("FY 2026")} · EUR</small></article>
                <article className="overview-v2-kpi"><span>EBITDA</span><strong>{formatCurrency(results.ebitda,true)}</strong><small>{formatPercent(results.ebitdaMarginPercent)} {t("margin")}</small></article>
                <article className="overview-v2-kpi"><span>{t("Gross profit")}</span><strong>{formatCurrency(results.grossProfit,true)}</strong><small>{formatPercent(results.grossMarginPercent)} {t("gross margin")}</small></article>
                <article className="overview-v2-kpi"><span>{t("Net income")}</span><strong className={results.netIncome<0?"negative-value":""}>{formatCurrency(results.netIncome,true)}</strong><small>{formatPercent(results.netMarginPercent)} {t("net margin")}</small></article>
              </section>
              <section className="overview-v2-main">
                <article className="overview-v2-panel overview-v2-performance">
                  <div className="overview-v2-panel-head"><div><span className="overview-v2-kicker">01 / {t("PERFORMANCE")}</span><h2>{t("Revenue performance")}</h2><p>{t("Six-month illustrative trend")}</p></div><span className="overview-v2-period">FEB — JUL 2026</span></div>
                  <div className="overview-v2-chart"><TrendChart language={language} /></div>
                  <div className="overview-v2-chart-foot"><span>{t("Revenue recognised")}</span><strong>{formatCurrency(results.revenue,true)}</strong><span className="overview-v2-foot-divider"></span><span>EBITDA</span><strong>{formatCurrency(results.ebitda,true)}</strong></div>
                </article>
                <article className="overview-v2-panel overview-v2-bridge">
                  <div className="overview-v2-panel-head"><div><span className="overview-v2-kicker">02 / {t("PROFITABILITY")}</span><h2>{t("Where revenue goes")}</h2><p>{t("From sales to the final result")}</p></div><span className="overview-v2-unit">EUR</span></div>
                  <div className="overview-v2-bridge-rows">
                    <div><span>{t("Revenue")}</span><strong>{formatCurrency(results.revenue)}</strong></div><div><span>{t("Cost of goods sold")}</span><strong>−{formatCurrency(results.costOfGoodsSold)}</strong></div><div className="overview-v2-subtotal"><span>{t("Gross profit")}</span><strong>{formatCurrency(results.grossProfit)}</strong></div><div><span>{t("Operating expenses")}</span><strong>−{formatCurrency(results.operatingExpenses)}</strong></div><div className="overview-v2-subtotal"><span>EBITDA</span><strong>{formatCurrency(results.ebitda)}</strong></div><div><span>{t("D&A, interest and tax")}</span><strong>−{formatCurrency(results.depreciationAndAmortisation+results.interestExpense+results.incomeTax)}</strong></div><div className="overview-v2-total"><span>{t("Net income")}</span><strong>{formatCurrency(results.netIncome)}</strong></div>
                  </div>
                  <button className="overview-v2-text-link" onClick={() => setView("model")}>{t("Inspect every assumption")} <Icon name="arrow" size={14}/></button>
                </article>
              </section>
              <section className="overview-v2-lower">
                <article className="overview-v2-panel overview-v2-margins"><div className="overview-v2-panel-head"><div><span className="overview-v2-kicker">03 / {t("MARGIN PROFILE")}</span><h2>{t("Value retained")}</h2></div></div>
                  <div className="overview-v2-margin-list">
                    <div><span>{t("Gross margin")}</span><strong>{formatPercent(results.grossMarginPercent)}</strong><i><b style={{width:`${Math.max(0,Math.min(100,results.grossMarginPercent))}%`}}/></i></div>
                    <div><span>{t("EBITDA margin")}</span><strong>{formatPercent(results.ebitdaMarginPercent)}</strong><i><b style={{width:`${Math.max(0,Math.min(100,results.ebitdaMarginPercent))}%`}}/></i></div>
                    <div><span>{t("Net margin")}</span><strong>{formatPercent(results.netMarginPercent)}</strong><i><b style={{width:`${Math.max(0,Math.min(100,Math.abs(results.netMarginPercent)))}%`}}/></i></div>
                  </div>
                </article>
                <article className="overview-v2-panel overview-v2-modules"><div className="overview-v2-panel-head"><div><span className="overview-v2-kicker">04 / {t("CONNECTED WORKSPACES")}</span><h2>{t("From analysis to execution")}</h2></div><span className="overview-v2-count">04 AREAS</span></div>
                  <div className="overview-v2-module-grid">
                    <button onClick={() => setView("planning")}><span>01</span><div><strong>{t("Planning & scenarios")}</strong><small>{t("Build budgets and compare outcomes.")}</small></div><Icon name="arrow" size={15}/></button>
                    <button onClick={() => setView("statements")}><span>02</span><div><strong>{t("Three-statement model")}</strong><small>{t("Connect profit, balance sheet and cash flow.")}</small></div><Icon name="arrow" size={15}/></button>
                    <button onClick={() => setView("operations")}><span>03</span><div><strong>{t("Business operations")}</strong><small>{t("Manage projects, risks and KPIs.")}</small></div><Icon name="arrow" size={15}/></button>
                    <button onClick={() => setView("reports")}><span>04</span><div><strong>{t("Reports & exports")}</strong><small>{t("Review and export management information.")}</small></div><Icon name="arrow" size={15}/></button>
                  </div>
                </article>
              </section>
              <footer className="overview-v2-note"><Icon name="info" size={15}/><span><strong>{t("Illustrative management model")}</strong> — {t("Figures are synthetic and based on manually entered assumptions. No accounting or banking data is connected.")}</span></footer>
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
