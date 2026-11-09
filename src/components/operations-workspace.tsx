"use client";

import { useEffect, useMemo, useState } from "react";
import { translate, type Language } from "@/i18n/translations";
import { EMPTY_OPERATIONS, OPERATIONS_STORAGE_KEY, parseOperationsState, projectBudgetVariance, riskScore, weightedPipeline, type BusinessKpi, type BusinessRisk, type Opportunity, type OpportunityStage, type OperationsState, type Project, type ProjectStatus } from "@/domain/operations";

type Section = "sales" | "projects" | "risks" | "kpis";
const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ops-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number, language: Language) => new Intl.NumberFormat(language === "es" ? "es-ES" : "en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const stageLabels: Record<OpportunityStage, string> = { lead: "Lead", qualified: "Qualified", proposal: "Proposal", won: "Won", lost: "Lost" };
const projectLabels: Record<ProjectStatus, string> = { planned: "Planned", active: "Active", onHold: "On hold", completed: "Completed" };

function downloadCsv(state: OperationsState) {
  const safe = (value: string | number) => {
    const raw = String(value);
    const protectedValue = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${protectedValue.replace(/"/g, '""')}"`;
  };
  const rows: (string | number)[][] = [["Module", "Name", "Owner / contact", "Value / score", "Status", "Date / notes"]];
  state.opportunities.forEach((x) => rows.push(["Sales", x.company, x.contact, x.value, x.stage, x.expectedClose]));
  state.projects.forEach((x) => rows.push(["Project", x.name, x.owner, x.budget, x.status, `Spent: ${x.spent}; due: ${x.dueDate}`]));
  state.risks.forEach((x) => rows.push(["Risk", x.title, x.owner, riskScore(x), x.status, x.mitigation]));
  state.kpis.forEach((x) => rows.push(["KPI", x.name, x.unit, x.actual, `Target: ${x.target}`, ""]));
  const csv = rows.map((row) => row.map(safe).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "enterpriseos-operations.csv"; anchor.click();
  URL.revokeObjectURL(url);
}

export function OperationsWorkspace({ language }: { language: Language }) {
  const t = (value: string) => translate(value, language);
  const [data, setData] = useState<OperationsState>(EMPTY_OPERATIONS);
  const [loaded, setLoaded] = useState(false);
  const [section, setSection] = useState<Section>("sales");
  const [storageMessage, setStorageMessage] = useState("Loading local workspace…");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [dealValue, setDealValue] = useState("10000");
  const [dealStage, setDealStage] = useState<OpportunityStage>("lead");
  const [closeDate, setCloseDate] = useState(today());
  const [projectName, setProjectName] = useState("");
  const [projectOwner, setProjectOwner] = useState("");
  const [projectBudget, setProjectBudget] = useState("10000");
  const [projectSpent, setProjectSpent] = useState("0");
  const [projectDue, setProjectDue] = useState(today());
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("planned");
  const [riskTitle, setRiskTitle] = useState("");
  const [riskOwner, setRiskOwner] = useState("");
  const [probability, setProbability] = useState("3");
  const [impact, setImpact] = useState("3");
  const [mitigation, setMitigation] = useState("");
  const [kpiName, setKpiName] = useState("");
  const [kpiActual, setKpiActual] = useState("0");
  const [kpiTarget, setKpiTarget] = useState("0");
  const [kpiUnit, setKpiUnit] = useState("%");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const restored = parseOperationsState(window.localStorage.getItem(OPERATIONS_STORAGE_KEY));
        setData(restored ?? EMPTY_OPERATIONS);
        setStorageMessage(restored ? "Saved operations workspace restored." : "Local workspace ready. Add your first records.");
      } catch {
        setStorageMessage("Browser storage is unavailable. Changes remain in this session.");
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(data));
        setStorageMessage("Changes saved in this browser.");
      } catch {
        setStorageMessage("Browser storage is unavailable. Changes remain in this session.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data, loaded]);

  const openPipeline = useMemo(() => weightedPipeline(data.opportunities.filter((x) => !["won", "lost"].includes(x.stage))), [data.opportunities]);
  const activeProjects = data.projects.filter((x) => x.status === "active").length;
  const highRisks = data.risks.filter((x) => x.status !== "closed" && riskScore(x) >= 15).length;
  const kpiOnTrack = data.kpis.filter((x) => x.target === 0 ? x.actual >= 0 : x.actual >= x.target).length;

  function addOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(dealValue);
    if (!company.trim() || !Number.isFinite(value) || value < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(closeDate)) return;
    const item: Opportunity = { id: makeId(), company: company.trim(), contact: contact.trim(), value, stage: dealStage, expectedClose: closeDate };
    setData((current) => ({ ...current, opportunities: [item, ...current.opportunities] }));
    setCompany(""); setContact(""); setDealValue("10000"); setDealStage("lead");
  }
  function addProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budget = Number(projectBudget); const spent = Number(projectSpent);
    if (!projectName.trim() || !projectOwner.trim() || !Number.isFinite(budget) || !Number.isFinite(spent) || budget < 0 || spent < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(projectDue)) return;
    const item: Project = { id: makeId(), name: projectName.trim(), owner: projectOwner.trim(), budget, spent, dueDate: projectDue, status: projectStatus };
    setData((current) => ({ ...current, projects: [item, ...current.projects] }));
    setProjectName(""); setProjectOwner(""); setProjectBudget("10000"); setProjectSpent("0"); setProjectStatus("planned");
  }
  function addRisk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!riskTitle.trim() || !riskOwner.trim() || !mitigation.trim()) return;
    const item: BusinessRisk = { id: makeId(), title: riskTitle.trim(), owner: riskOwner.trim(), probability: Number(probability), impact: Number(impact), mitigation: mitigation.trim(), status: "open" };
    setData((current) => ({ ...current, risks: [item, ...current.risks] }));
    setRiskTitle(""); setRiskOwner(""); setMitigation(""); setProbability("3"); setImpact("3");
  }
  function addKpi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const actual = Number(kpiActual); const target = Number(kpiTarget);
    if (!kpiName.trim() || !kpiUnit.trim() || !Number.isFinite(actual) || !Number.isFinite(target)) return;
    const item: BusinessKpi = { id: makeId(), name: kpiName.trim(), actual, target, unit: kpiUnit.trim() };
    setData((current) => ({ ...current, kpis: [item, ...current.kpis] }));
    setKpiName(""); setKpiActual("0"); setKpiTarget("0");
  }
  function remove<K extends keyof OperationsState>(key: K, id: string) {
    setData((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }));
  }

  const sections: { id: Section; label: string; count: number }[] = [
    { id: "sales", label: "Sales pipeline", count: data.opportunities.length },
    { id: "projects", label: "Projects", count: data.projects.length },
    { id: "risks", label: "Risk register", count: data.risks.length },
    { id: "kpis", label: "KPI scorecard", count: data.kpis.length },
  ];

  return (
    <section className="operations-workspace">
      <div className="page-heading">
        <div><div className="eyebrow">{t("BUSINESS OPERATIONS")} <span className="eyebrow-dot" /> {t("LOCAL WORKSPACE")}</div><h1>{t("Operations & intelligence")}</h1><p>{t("Manage commercial opportunities, project delivery, business risks and performance targets in one place.")}</p></div>
        <div className="heading-actions"><span className="demo-badge"><i /> {t("LOCAL DATA")}</span><button className="secondary-button" onClick={() => downloadCsv(data)}><span>↓</span> {t("Export CSV")}</button></div>
      </div>
      <div className="operations-metrics">
        <article className="metric-card"><span className="metric-label">{t("Weighted open pipeline")}</span><strong>{money(openPipeline, language)}</strong><small>{data.opportunities.filter((x) => !["won", "lost"].includes(x.stage)).length} {t("open opportunities")}</small></article>
        <article className="metric-card"><span className="metric-label">{t("Active projects")}</span><strong>{activeProjects}</strong><small>{data.projects.length} {t("total projects")}</small></article>
        <article className="metric-card"><span className="metric-label">{t("High-priority risks")}</span><strong>{highRisks}</strong><small>{t("Open risks scoring 15 or more")}</small></article>
        <article className="metric-card"><span className="metric-label">{t("KPIs on target")}</span><strong>{data.kpis.length ? `${kpiOnTrack}/${data.kpis.length}` : "—"}</strong><small>{t("Based on actual versus target")}</small></article>
      </div>
      <div className="operations-tabs" role="tablist" aria-label={t("Operations modules")}>
        {sections.map((item) => <button key={item.id} role="tab" aria-selected={section === item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}>{t(item.label)} <span>{item.count}</span></button>)}
      </div>
      <div className="operations-content">
        {section === "sales" && <>
          <div className="operations-section-heading"><div><div className="panel-kicker">{t("CUSTOMER RELATIONSHIPS")}</div><h2>{t("Sales pipeline")}</h2><p>{t("Track opportunities from first contact to closed outcome. Weighted pipeline uses editable stage probabilities.")}</p></div></div>
          <form className="operations-form" onSubmit={addOpportunity}>
            <label>{t("Company")}<input required maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t("Company name")} /></label>
            <label>{t("Contact")}<input maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("Optional contact")} /></label>
            <label>{t("Deal value (€)")}<input required type="number" min="0" step="0.01" value={dealValue} onChange={(e) => setDealValue(e.target.value)} /></label>
            <label>{t("Stage")}<select value={dealStage} onChange={(e) => setDealStage(e.target.value as OpportunityStage)}>{Object.entries(stageLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
            <label>{t("Expected close")}<input type="date" required value={closeDate} onChange={(e) => setCloseDate(e.target.value)} /></label>
            <button className="primary-button" type="submit">{t("Add opportunity")}</button>
          </form>
          <div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>{t("Company")}</th><th>{t("Contact")}</th><th>{t("Deal value (€)")}</th><th>{t("Stage")}</th><th>{t("Expected close")}</th><th /></tr></thead><tbody>
            {data.opportunities.map((x) => <tr key={x.id}><td><strong>{x.company}</strong></td><td>{x.contact || "—"}</td><td>{money(x.value, language)}</td><td><select aria-label={t("Stage")} value={x.stage} onChange={(e) => setData((current) => ({ ...current, opportunities: current.opportunities.map((row) => row.id === x.id ? { ...row, stage: e.target.value as OpportunityStage } : row) }))}>{Object.entries(stageLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></td><td>{x.expectedClose}</td><td><button className="operations-delete" onClick={() => remove("opportunities", x.id)} aria-label={t("Delete record")}>×</button></td></tr>)}
          </tbody></table>{data.opportunities.length === 0 && <div className="operations-empty">{t("No opportunities yet. Add a deal to start building your pipeline.")}</div>}</div>
          <p className="operations-note">{t("Stage probabilities: Lead 10%, Qualified 25%, Proposal 60%, Won 100%, Lost 0%. These are editable product defaults, not calibrated forecasts.")}</p>
        </>}
        {section === "projects" && <>
          <div className="operations-section-heading"><div><div className="panel-kicker">{t("DELIVERY MANAGEMENT")}</div><h2>{t("Project portfolio")}</h2><p>{t("Monitor owners, delivery dates, budgets and remaining project headroom.")}</p></div></div>
          <form className="operations-form" onSubmit={addProject}>
            <label>{t("Project name")}<input required maxLength={120} value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label>
            <label>{t("Owner")}<input required maxLength={120} value={projectOwner} onChange={(e) => setProjectOwner(e.target.value)} /></label>
            <label>{t("Budget (€)")}<input required type="number" min="0" step="0.01" value={projectBudget} onChange={(e) => setProjectBudget(e.target.value)} /></label>
            <label>{t("Spent (€)")}<input required type="number" min="0" step="0.01" value={projectSpent} onChange={(e) => setProjectSpent(e.target.value)} /></label>
            <label>{t("Due date")}<input required type="date" value={projectDue} onChange={(e) => setProjectDue(e.target.value)} /></label>
            <label>{t("Status")}<select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}>{Object.entries(projectLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
            <button className="primary-button" type="submit">{t("Add project")}</button>
          </form>
          <div className="operations-table-wrap"><table className="operations-table"><thead><tr><th>{t("Project")}</th><th>{t("Owner")}</th><th>{t("Budget")}</th><th>{t("Spent")}</th><th>{t("Remaining")}</th><th>{t("Status")}</th><th /></tr></thead><tbody>
            {data.projects.map((x) => { const remaining = projectBudgetVariance(x); return <tr key={x.id}><td><strong>{x.name}</strong><small className="operations-subline">{t("Due")}: {x.dueDate}</small></td><td>{x.owner}</td><td>{money(x.budget, language)}</td><td>{money(x.spent, language)}</td><td className={remaining < 0 ? "operations-negative" : ""}>{money(remaining, language)}</td><td><select aria-label={t("Status")} value={x.status} onChange={(e) => setData((current) => ({ ...current, projects: current.projects.map((row) => row.id === x.id ? { ...row, status: e.target.value as ProjectStatus } : row) }))}>{Object.entries(projectLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></td><td><button className="operations-delete" onClick={() => remove("projects", x.id)} aria-label={t("Delete record")}>×</button></td></tr>; })}
          </tbody></table>{data.projects.length === 0 && <div className="operations-empty">{t("No projects yet. Add a project and assign an owner and budget.")}</div>}</div>
          <p className="operations-note">{t("Remaining budget is budget minus recorded spend. A negative value indicates an overrun; no costs are imported automatically.")}</p>
        </>}
        {section === "risks" && <>
          <div className="operations-section-heading"><div><div className="panel-kicker">{t("RISK & CONTROLS")}</div><h2>{t("Risk register")}</h2><p>{t("Score each risk using probability and impact from 1 (low) to 5 (high).")}</p></div></div>
          <form className="operations-form" onSubmit={addRisk}>
            <label>{t("Risk description")}<input required maxLength={160} value={riskTitle} onChange={(e) => setRiskTitle(e.target.value)} /></label>
            <label>{t("Owner")}<input required maxLength={120} value={riskOwner} onChange={(e) => setRiskOwner(e.target.value)} /></label>
            <label>{t("Probability")}<select value={probability} onChange={(e) => setProbability(e.target.value)}>{[1,2,3,4,5].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>{t("Impact")}<select value={impact} onChange={(e) => setImpact(e.target.value)}>{[1,2,3,4,5].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="operations-wide">{t("Mitigation plan")}<input required maxLength={500} value={mitigation} onChange={(e) => setMitigation(e.target.value)} /></label>
            <button className="primary-button" type="submit">{t("Add risk")}</button>
          </form>
          <div className="operations-risk-grid">{data.risks.map((x) => <article className="operations-risk-card" key={x.id}><div className="operations-risk-top"><span className={riskScore(x) >= 20 ? "critical" : riskScore(x) >= 15 ? "high" : riskScore(x) >= 8 ? "medium" : "low"}>{t(riskScore(x) >= 20 ? "Critical" : riskScore(x) >= 15 ? "High" : riskScore(x) >= 8 ? "Medium" : "Low")} · {riskScore(x)}/25</span><button className="operations-delete" onClick={() => remove("risks", x.id)} aria-label={t("Delete record")}>×</button></div><h3>{x.title}</h3><p>{t("Owner")}: {x.owner}</p><p>{t("Probability")}: {x.probability}/5 · {t("Impact")}: {x.impact}/5</p><div className="operations-mitigation"><strong>{t("Mitigation plan")}</strong><span>{x.mitigation}</span></div><label className="operations-status-label">{t("Status")}<select value={x.status} onChange={(e) => setData((current) => ({ ...current, risks: current.risks.map((row) => row.id === x.id ? { ...row, status: e.target.value as BusinessRisk["status"] } : row) }))}><option value="open">{t("Open")}</option><option value="mitigating">{t("Mitigating")}</option><option value="closed">{t("Closed")}</option></select></label></article>)}{data.risks.length === 0 && <div className="operations-empty">{t("No risks recorded. Add a risk with an owner and mitigation plan.")}</div>}</div>
        </>}
        {section === "kpis" && <>
          <div className="operations-section-heading"><div><div className="panel-kicker">{t("PERFORMANCE MANAGEMENT")}</div><h2>{t("KPI scorecard")}</h2><p>{t("Compare actual results with targets. Define the unit and direction before interpreting performance.")}</p></div></div>
          <form className="operations-form" onSubmit={addKpi}>
            <label>{t("KPI name")}<input required maxLength={100} value={kpiName} onChange={(e) => setKpiName(e.target.value)} /></label>
            <label>{t("Actual")}<input required type="number" step="any" value={kpiActual} onChange={(e) => setKpiActual(e.target.value)} /></label>
            <label>{t("Target")}<input required type="number" step="any" value={kpiTarget} onChange={(e) => setKpiTarget(e.target.value)} /></label>
            <label>{t("Unit")}<input required maxLength={20} value={kpiUnit} onChange={(e) => setKpiUnit(e.target.value)} /></label>
            <button className="primary-button" type="submit">{t("Add KPI")}</button>
          </form>
          <div className="operations-kpi-grid">{data.kpis.map((x) => { const ratio = x.target === 0 ? (x.actual >= 0 ? 100 : 0) : Math.max(0, Math.min(150, x.actual / x.target * 100)); return <article className="operations-kpi-card" key={x.id}><div className="operations-kpi-heading"><span>{x.name}</span><button className="operations-delete" onClick={() => remove("kpis", x.id)} aria-label={t("Delete record")}>×</button></div><strong>{x.actual.toLocaleString(language === "es" ? "es-ES" : "en-IE")} <small>{x.unit}</small></strong><div className="operations-kpi-track"><i style={{ width: `${ratio}%` }} /></div><div className="operations-kpi-foot"><span>{t("Target")}: {x.target.toLocaleString(language === "es" ? "es-ES" : "en-IE")} {x.unit}</span><b className={x.actual >= x.target ? "on-track" : "behind"}>{x.actual >= x.target ? t("On target") : t("Below target")}</b></div></article>; })}{data.kpis.length === 0 && <div className="operations-empty">{t("No KPIs yet. Add a measurable indicator and target.")}</div>}</div>
          <p className="operations-note">{t("This scorecard assumes higher values are better. For cost or defect KPIs, use a transformed metric or add direction settings in a later release.")}</p>
        </>}
      </div>
      <div className="operations-storage-note">◉ {t(storageMessage)}</div>
      <p className="operations-disclaimer">{t("Operations records are stored only in this browser. They are not synced, shared with a team or connected to CRM, HR, project or accounting platforms. Export a CSV backup before clearing browser data. Do not enter confidential company information.")}</p>
    </section>
  );
}
