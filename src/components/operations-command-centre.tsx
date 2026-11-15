"use client";

import { useEffect, useMemo, useState } from "react";
import type { Language } from "@/i18n/translations";
import type { OperationsState } from "@/domain/operations";

type Kind = keyof OperationsState;
type RecordItem = { id: string; kind: Kind; title: string; subtitle: string; status: string; date: string; value: string; raw: Record<string, unknown> };
type SavedView = { id: string; name: string; query: string; status: string; view: ViewMode; section: string };
type ViewMode = "table" | "kanban" | "calendar";
type Section = "sales"|"projects"|"risks"|"kpis"|"cost-centers"|"expenses"|"reports";
type Snapshot = { id: string; createdAt: string; data: OperationsState; summary: string };
const VIEWS_KEY = "enterpriseos:operations:saved-views:v1";
const HISTORY_KEY = "enterpriseos:operations:audit-history:v1";
const DISMISSED_KEY = "enterpriseos:operations:dismissed-alerts:v1";
const dateLabel = (value: string) => value ? new Date(value + "T12:00:00").toLocaleDateString() : "—";

function recordsFrom(data: OperationsState): RecordItem[] {
  return [
    ...data.opportunities.map((x) => ({ id:x.id,kind:"opportunities" as const,title:x.company,subtitle:x.contact || "Sales opportunity",status:x.stage,date:x.expectedClose,value:new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(x.value),raw:x as unknown as Record<string,unknown> })),
    ...data.projects.map((x) => ({ id:x.id,kind:"projects" as const,title:x.name,subtitle:x.owner,status:x.status,date:x.dueDate,value:new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(x.budget),raw:x as unknown as Record<string,unknown> })),
    ...data.risks.map((x) => ({ id:x.id,kind:"risks" as const,title:x.title,subtitle:x.owner,status:x.status,date:"",value:`${x.probability*x.impact}/25`,raw:x as unknown as Record<string,unknown> })),
    ...data.kpis.map((x) => ({ id:x.id,kind:"kpis" as const,title:x.name,subtitle:x.unit,status:"KPI",date:"",value:`${x.actual} / ${x.target} ${x.unit}`,raw:x as unknown as Record<string,unknown> })),
    ...data.costCenters.map((x) => ({ id:x.id,kind:"costCenters" as const,title:x.name,subtitle:x.owner,status:x.period,date:"",value:new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(x.budget),raw:x as unknown as Record<string,unknown> })),
    ...data.expenses.map((x) => ({ id:x.id,kind:"expenses" as const,title:x.description,subtitle:x.supplier,status:x.status,date:x.date,value:new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(x.amount),raw:x as unknown as Record<string,unknown> })),
  ];
}

function recordDate(item: RecordItem) { return item.date || "9999-12-31"; }
function statusOptions(kind: Kind): string[] {
  if (kind === "opportunities") return ["lead","qualified","proposal","won","lost"];
  if (kind === "projects") return ["planned","active","onHold","completed"];
  if (kind === "risks") return ["open","mitigating","closed"];
  if (kind === "expenses") return ["unpaid","paid"];
  return [];
}

export function OperationsCommandCentre({ data, setData, language, section, setSection, cloudStatus }: {
  data: OperationsState;
  setData: React.Dispatch<React.SetStateAction<OperationsState>>;
  language: Language;
  section: Section;
  setSection: (section: "sales"|"projects"|"risks"|"kpis"|"cost-centers"|"expenses"|"reports") => void;
  cloudStatus: string;
}) {
  const es = language === "es";
  const [query,setQuery] = useState("");
  const [status,setStatus] = useState("all");
  const [mode,setMode] = useState<ViewMode>("table");
  const [savedViews,setSavedViews] = useState<SavedView[]>([]);
  const [activeView,setActiveView] = useState("");
  const [showNotifications,setShowNotifications] = useState(false);
  const [showHistory,setShowHistory] = useState(false);
  const [history,setHistory] = useState<Snapshot[]>([]);
  const [dismissed,setDismissed] = useState<string[]>([]);
  const [selected,setSelected] = useState<string[]>([]);
  const [detail,setDetail] = useState<RecordItem|null>(null);
  const [viewName,setViewName] = useState("");
  const [showSaveView,setShowSaveView] = useState(false);
  const [bulkStatus,setBulkStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setSavedViews(JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]")); } catch { setSavedViews([]); }
      try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")); } catch { setHistory([]); }
      try { setDismissed(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")); } catch { setDismissed([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { try { localStorage.setItem(VIEWS_KEY,JSON.stringify(savedViews)); } catch {} },[savedViews]);
  useEffect(() => { try { localStorage.setItem(DISMISSED_KEY,JSON.stringify(dismissed)); } catch {} },[dismissed]);
  useEffect(() => {
    if (!data || !Array.isArray(data.opportunities)) return;
    const timer = window.setTimeout(() => {
      if (recordsFrom(data).length === 0) return;
      const snapshot: Snapshot = { id: String(Date.now()) + "-" + Math.random().toString(36).slice(2,7), createdAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(data)) as OperationsState, summary: recordsFrom(data).length + (es ? " registros guardados" : " saved records") };
      setHistory((current) => {
        const last = current[0];
        if (last && JSON.stringify(last.data) === JSON.stringify(data)) return current;
        const next = [snapshot,...current].slice(0,8);
        try { localStorage.setItem(HISTORY_KEY,JSON.stringify(next)); } catch {}
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  },[data]);

  const allRecords = useMemo(() => recordsFrom(data),[data]);
  const alerts = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    const rows: {id:string;title:string;description:string;level:"high"|"medium"}[] = [];
    data.risks.filter(x=>x.status!=="closed" && x.probability*x.impact>=15).forEach(x=>rows.push({id:"risk-"+x.id,title:x.title,description:es?"Riesgo prioritario pendiente":"High-priority risk remains open",level:"high"}));
    data.projects.filter(x=>x.status!=="completed" && x.spent>x.budget).forEach(x=>rows.push({id:"project-"+x.id,title:x.name,description:es?"Proyecto por encima del presupuesto":"Project is over budget",level:"high"}));
    data.projects.filter(x=>x.status!=="completed" && x.dueDate<today).forEach(x=>rows.push({id:"due-"+x.id,title:x.name,description:es?"Fecha de entrega vencida":"Project due date has passed",level:"medium"}));
    data.expenses.filter(x=>x.status==="unpaid" && x.date<today).forEach(x=>rows.push({id:"expense-"+x.id,title:x.description,description:es?"Gasto pendiente de pago":"Expense is marked unpaid",level:"medium"}));
    return rows.filter(x=>!dismissed.includes(x.id));
  },[data,dismissed,es]);

  const filtered = useMemo(() => allRecords.filter(item => {
    const haystack = [item.title,item.subtitle,item.status,item.kind,item.value,item.date].join(" ").toLowerCase();
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const matchesStatus = status==="all" || item.status===status;
    const matchesSection = Boolean(query.trim()) || section==="reports" || (section==="sales" ? item.kind==="opportunities" : section==="cost-centers" ? item.kind==="costCenters" : item.kind===section);
    return matchesQuery && matchesStatus && matchesSection;
  }).sort((a,b)=>recordDate(a).localeCompare(recordDate(b))),[allRecords,query,status,section]);

  const showResults = true;
  const selectedItems = allRecords.filter(x=>selected.includes(x.kind+":"+x.id));
  const commonStatuses = selectedItems.length>0 && selectedItems.every(x=>x.kind===selectedItems[0].kind) ? statusOptions(selectedItems[0].kind) : [];
  const toggleSelected = (item:RecordItem) => setSelected(current=>current.includes(item.kind+":"+item.id)?current.filter(x=>x!==item.kind+":"+item.id):[...current,item.kind+":"+item.id]);
  const updateStatus = (item:RecordItem,next:string) => {
    const key = item.kind;
    setData(current=>({...current,[key]:(current[key] as {id:string;status?:string}[]).map(row=>row.id===item.id?{...row,status:next}:row)} as OperationsState));
    setDetail(current=>current?.id===item.id?{...item,status:next}:current);
  };
  const deleteSelected = () => {
    if (!selectedItems.length || !window.confirm(es?`¿Eliminar ${selectedItems.length} registros seleccionados? Esta acción no se puede deshacer.`:`Delete ${selectedItems.length} selected records? This cannot be undone.`)) return;
    const ids = new Map<Kind,Set<string>>();
    selectedItems.forEach(x=>{if(!ids.has(x.kind))ids.set(x.kind,new Set());ids.get(x.kind)!.add(x.id);});
    setData(current=>{
      const next={...current} as OperationsState;
      ids.forEach((set,kind)=>{(next[kind] as {id:string}[])=(next[kind] as {id:string}[]).filter(x=>!set.has(x.id));});
      if(ids.has("costCenters")) next.expenses=next.expenses.filter(x=>!ids.get("costCenters")!.has(x.costCenterId));
      return next;
    });
    setSelected([]);setDetail(null);
  };
  const applyBulkStatus = () => {
    if(!bulkStatus || !commonStatuses.length)return;
    selectedItems.forEach(item=>updateStatus(item,bulkStatus));
    setBulkStatus("");
  };
  const saveView = () => {
    if(!viewName.trim())return;
    const next:SavedView={id:`${Date.now()}`,name:viewName.trim().slice(0,40),query,status,view:mode,section};
    setSavedViews(current=>[next,...current].slice(0,12));setActiveView(next.id);setViewName("");setShowSaveView(false);
  };
  const applyView = (id:string) => {
    setActiveView(id);
    const found=savedViews.find(x=>x.id===id);if(!found)return;
    setQuery(found.query);setStatus(found.status);setMode(found.view);setSection(found.section as typeof section);
  };
  const restoreSnapshot = (snapshot:Snapshot) => {
    if(!window.confirm(es?"¿Restaurar esta versión? Los datos actuales serán sustituidos.":"Restore this version? Current data will be replaced."))return;
    setData(snapshot.data);setShowHistory(false);setSelected([]);
  };
  const renderCard = (item:RecordItem) => <article className="ops-command-card" key={item.kind+":"+item.id}>
    <div className="ops-command-card-top"><label className="ops-select-record"><input type="checkbox" checked={selected.includes(item.kind+":"+item.id)} onChange={()=>toggleSelected(item)} aria-label={es?"Seleccionar registro":"Select record"}/><span /></label><button className="ops-command-open" onClick={()=>setDetail(item)}>{es?"Abrir detalle":"Open details"}</button></div>
    <button className="ops-command-card-main" onClick={()=>setDetail(item)}><small>{item.kind==="costCenters"?"COST CENTRE":item.kind.toUpperCase()}</small><strong>{item.title}</strong><span>{item.subtitle}</span><b>{item.value}</b></button>
    <div className="ops-command-card-foot"><span>{item.date?dateLabel(item.date):item.status}</span><span className="ops-command-status">{item.status}</span></div>
  </article>;

  return <section className="ops-command-centre" aria-label={es?"Centro de operaciones":"Operations command centre"}>
    <div className="ops-command-toolbar">
      <label className="ops-global-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={es?"Buscar empresas, proyectos, riesgos, KPI y gastos…":"Search companies, projects, risks, KPIs and expenses…"} /><kbd> / </kbd></label>
      <select className="ops-view-select" value={activeView} onChange={e=>applyView(e.target.value)}><option value="">{es?"Vistas guardadas":"Saved views"}</option>{savedViews.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <select className="ops-view-select" value={status} onChange={e=>{setStatus(e.target.value);setActiveView("");}} aria-label={es?"Filtrar por estado":"Filter by status"}><option value="all">{es?"Todos los estados":"All statuses"}</option>{["open","mitigating","closed","lead","qualified","proposal","won","lost","planned","active","onHold","completed","paid","unpaid"].map(x=><option key={x} value={x}>{x}</option>)}</select>
      <div className="ops-view-switch" role="group" aria-label={es?"Modo de vista":"View mode"}>{(["table","kanban","calendar"] as ViewMode[]).map(v=><button key={v} className={mode===v?"active":""} onClick={()=>setMode(v)}>{v==="table"?"Tabla":v==="kanban"?"Kanban":"Calendario"}</button>)}</div>
      <button className="ops-utility-button" onClick={()=>setShowSaveView(x=>!x)}>{es?"Guardar vista":"Save view"}</button>
      <button className={"ops-utility-button "+(showNotifications?"active":"")} onClick={()=>setShowNotifications(x=>!x)}>{es?"Alertas":"Alerts"} <b>{alerts.length}</b></button>
      <button className={"ops-utility-button "+(showHistory?"active":"")} onClick={()=>setShowHistory(x=>!x)}>{es?"Historial":"History"}</button>
    </div>
    {showSaveView&&<div className="ops-save-view"><input value={viewName} onChange={e=>setViewName(e.target.value)} maxLength={40} placeholder={es?"Nombre de la vista":"View name"} onKeyDown={e=>{if(e.key==="Enter")saveView();}}/><button onClick={saveView}>{es?"Guardar":"Save"}</button><button onClick={()=>setShowSaveView(false)}>{es?"Cancelar":"Cancel"}</button></div>}
    <div className="ops-command-meta"><span>{filtered.length} {es?"registros":"records"} {es?"en esta vista":"in this view"}</span><span>{cloudStatus}</span></div>
    {showNotifications&&<div className="ops-command-panel"><div className="ops-command-panel-heading"><div><small>INTELLIGENCE</small><h3>{es?"Centro de alertas":"Alert centre"}</h3></div><button onClick={()=>setShowNotifications(false)}>×</button></div>{alerts.length?alerts.map(a=><div className="ops-alert-row" key={a.id}><i className={a.level}/><div><strong>{a.title}</strong><span>{a.description}</span></div><button onClick={()=>setDismissed(current=>[...current,a.id])}>{es?"Descartar":"Dismiss"}</button></div>):<p className="ops-command-empty">{es?"No hay alertas activas. Todo está al día.":"No active alerts. Everything is up to date."}</p>}</div>}
    {showHistory&&<div className="ops-command-panel ops-history-panel"><div className="ops-command-panel-heading"><div><small>{es?"VERSIONES LOCALES":"LOCAL VERSIONS"}</small><h3>{es?"Historial":"History"} <span className="ops-history-count">{history.length}</span></h3><p>{es?"Se guardan automáticamente los últimos 8 cambios con datos.":"The last 8 data changes are saved automatically."}</p></div><button onClick={()=>setShowHistory(false)} aria-label={es?"Cerrar historial":"Close history"}>×</button></div>{history.slice(0,5).map(h=><div className="ops-history-row" key={h.id}><div><strong>{new Date(h.createdAt).toLocaleString(es?"es-ES":"en-IE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</strong><span>{h.summary}</span></div><button onClick={()=>restoreSnapshot(h)}>{es?"Restaurar":"Restore"}</button></div>)}{history.length===0&&<p className="ops-command-empty">{es?"Todavía no hay versiones guardadas.":"No saved versions yet."}</p>}</div>}
    {showResults&&<div className="ops-command-results">
      {mode==="table"&&<div className="ops-command-table-wrap"><table className="ops-command-table"><thead><tr><th><input type="checkbox" aria-label={es?"Seleccionar todos":"Select all"} checked={filtered.length>0&&filtered.every(x=>selected.includes(x.kind+":"+x.id))} onChange={e=>setSelected(current=>e.target.checked?Array.from(new Set([...current,...filtered.map(x=>x.kind+":"+x.id)])):current.filter(k=>!filtered.some(x=>k===x.kind+":"+x.id)))}/></th><th>{es?"Registro":"Record"}</th><th>{es?"Módulo":"Module"}</th><th>{es?"Responsable / detalle":"Owner / detail"}</th><th>{es?"Estado":"Status"}</th><th>{es?"Fecha":"Date"}</th><th>{es?"Valor":"Value"}</th></tr></thead><tbody>{filtered.map(item=><tr key={item.kind+":"+item.id}><td><input type="checkbox" checked={selected.includes(item.kind+":"+item.id)} onChange={()=>toggleSelected(item)} aria-label={es?"Seleccionar registro":"Select record"}/></td><td><button className="ops-record-link" onClick={()=>setDetail(item)}>{item.title}</button></td><td>{item.kind}</td><td>{item.subtitle}</td><td><span className="ops-command-status">{item.status}</span></td><td>{item.date?dateLabel(item.date):"—"}</td><td>{item.value}</td></tr>)}</tbody></table></div>}
      {mode==="kanban"&&<div className="ops-kanban">{Array.from(new Set(filtered.map(x=>x.status))).map(group=><div className="ops-kanban-column" key={group}><div className="ops-kanban-heading"><strong>{group}</strong><span>{filtered.filter(x=>x.status===group).length}</span></div>{filtered.filter(x=>x.status===group).map(renderCard)}</div>)}</div>}
      {mode==="calendar"&&<div className="ops-calendar-list">{filtered.filter(x=>x.date).map(item=><div className="ops-calendar-event" key={item.kind+":"+item.id}><time>{dateLabel(item.date)}</time>{renderCard(item)}</div>)}{!filtered.some(x=>x.date)&&<div className="ops-command-empty">{es?"Estos registros no tienen fechas para mostrarse en calendario.":"These records have no dates to display in calendar view."}</div>}</div>}
      {!filtered.length&&<div className="ops-command-empty">{query||status!=="all"?(es?"No hay resultados para estos filtros.":"No records match these filters."):(es?"Usa la búsqueda global para localizar cualquier registro de Operaciones.":"Use global search to find any Operations record.")}</div>}
    </div>}
    {selectedItems.length>0&&<div className="ops-bulk-bar"><strong>{selectedItems.length} {es?"seleccionados":"selected"}</strong>{commonStatuses.length>0&&<><select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}><option value="">{es?"Cambiar estado…":"Change status…"}</option>{commonStatuses.map(x=><option key={x} value={x}>{x}</option>)}</select><button onClick={applyBulkStatus} disabled={!bulkStatus}>{es?"Aplicar":"Apply"}</button></>}<button className="danger" onClick={deleteSelected}>{es?"Eliminar selección":"Delete selection"}</button><button onClick={()=>setSelected([])}>{es?"Limpiar":"Clear"}</button></div>}
    {detail&&<div className="ops-detail-backdrop" onClick={()=>setDetail(null)}><aside className="ops-detail-drawer" onClick={e=>e.stopPropagation()}><div className="ops-command-panel-heading"><div><small>{detail.kind.toUpperCase()}</small><h3>{detail.title}</h3><p>{detail.subtitle}</p></div><button onClick={()=>setDetail(null)}>×</button></div><div className="ops-detail-value"><span>{es?"Valor":"Value"}</span><strong>{detail.value}</strong></div><div className="ops-detail-fields">{Object.entries(detail.raw).filter(([key])=>key!=="id").map(([key,value])=><div key={key}><span>{key.replace(/[A-Z]/g,m=>" "+m).replace(/^./,m=>m.toUpperCase())}</span><strong>{typeof value==="object"?JSON.stringify(value):String(value)}</strong></div>)}</div>{statusOptions(detail.kind).length>0&&<label className="ops-detail-status">{es?"Editar estado":"Edit status"}<select value={detail.status} onChange={e=>updateStatus(detail,e.target.value)}>{statusOptions(detail.kind).map(x=><option key={x} value={x}>{x}</option>)}</select></label>}<button className="ops-detail-close" onClick={()=>setDetail(null)}>{es?"Cerrar detalle":"Close details"}</button></aside></div>}
  </section>;
}
