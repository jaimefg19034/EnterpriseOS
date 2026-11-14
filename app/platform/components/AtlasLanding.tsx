"use client";

import { useEffect, useState, type PointerEvent } from "react";
import LiquidAtlasScene from "./LiquidAtlasScene";
import { scenarios, type Scenario } from "./scenarios";
import { PlanningWorkspace } from "@/components/planning-workspace";

const nav = [
  ["#signal", "01", "La señal"],
  ["#system", "02", "El sistema"],
  ["#anatomy", "03", "Anatomía"],
  ["#studio", "04", "Escenarios"],
  ["#evidence", "05", "Alcance"],
] as const;

const modules = [
  { n: "01", code: "PERFORMANCE", title: "Resultado", desc: "P&L de gestión, estructura de costes y lectura de desviaciones.", stat: "P&L / PLAN / ACTUAL", type: "bars" },
  { n: "02", code: "PLANNING", title: "Planificación", desc: "Presupuestos y escenarios para poner a prueba hipótesis.", stat: "BUDGET / SCENARIOS", type: "curves" },
  { n: "03", code: "LIQUIDITY", title: "Tesorería", desc: "Previsión directa de caja a trece semanas con entradas manuales.", stat: "13-WEEK CASH VIEW", type: "wave" },
  { n: "04", code: "WORKING CAPITAL", title: "Capital circulante", desc: "Seguimiento de cobros, pagos, vencimientos y antigüedad.", stat: "AR / AP / AGEING", type: "ledger" },
  { n: "05", code: "OPERATIONS", title: "Centros de coste", desc: "Lectura operativa y seguimiento manual por centro de coste.", stat: "COST CENTRES", type: "nodes" },
  { n: "06", code: "REPORTING", title: "Reporting", desc: "Informes de gestión disponibles y exportación de resultados.", stat: "MANAGEMENT REPORTS", type: "report" },
  { n: "07", code: "MODEL", title: "Modelo financiero", desc: "Relaciones simplificadas entre resultados, balance y caja.", stat: "3-STATEMENT MODEL", type: "model" },
  { n: "08", code: "CONTROL", title: "Trazabilidad", desc: "Supuestos identificables y separación entre datos y estimaciones.", stat: "INPUT → OUTPUT", type: "control" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="ax-eyebrow"><i />{children}</span>;
}

function AtlasHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <header className="ax-header">
        <a className="ax-wordmark" href="#top" aria-label="EnterpriseOS, inicio"><span className="ax-mark">E<span>O</span></span><span>ENTERPRISE<span>OS</span><small>FINANCIAL DECISION INTELLIGENCE</small></span></a>
        <div className="ax-header-center"><span>INDEPENDENT FINANCE SYSTEMS</span><i /> <span>FIELD NOTES / 2026</span></div>
        <div className="ax-header-actions">
          <a className="ax-workspace-link" href="/EnterpriseOS/">OPEN WORKSPACE <b>↗</b></a>
          <button className={open ? "ax-menu-button is-open" : "ax-menu-button"} onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Cerrar menú" : "Abrir menú"}><span /><span /></button>
        </div>
      </header>
      {open && <div className="ax-menu-overlay" role="dialog" aria-modal="true" aria-label="Navegación principal">
        <div className="ax-menu-top"><span>EOS / INDEX 001—005</span><button onClick={() => setOpen(false)}>CLOSE ×</button></div>
        <nav>{nav.map(([href, n, label]) => <a href={href} key={href} onClick={() => setOpen(false)}><small>{n}</small><strong>{label}</strong><i>↗</i></a>)}</nav>
        <div className="ax-menu-bottom"><span>MODEL WHAT MATTERS.</span><a href="/EnterpriseOS/" onClick={() => setOpen(false)}>ENTRAR EN WORKSPACE ↗</a></div>
      </div>}
    </>
  );
}

function Preloader() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVisible(false); return; }
    const timer = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="ax-preloader" aria-hidden="true"><div className="ax-preloader-mark">E<span>O</span>S</div><div className="ax-preloader-track"><i /></div><small>INITIALISING FINANCIAL ATLAS / 001</small></div>;
}

function Hero({ scenario }: { scenario: Scenario }) {
  const active = scenarios[scenario];
  const move = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--px", ((event.clientX - rect.left) / rect.width * 100) + "%");
    event.currentTarget.style.setProperty("--py", ((event.clientY - rect.top) / rect.height * 100) + "%");
  };
  return (
    <section className="ax-hero" id="top" onPointerMove={move}>
      <div className="ax-hero-grid" aria-hidden="true" />
      <div className="ax-hero-atmosphere" aria-hidden="true" />
      <div className="ax-hero-sculpture" aria-hidden="true"><LiquidAtlasScene /></div>
      <div className="ax-hero-topline"><span>FIG. 001 — THE FINANCIAL ATLAS</span><span>40° 25' N / 03° 42' W</span><span>BUILT FOR DECISION MAKERS</span></div>
      <div className="ax-hero-title-wrap">
        <div className="ax-hero-side-index"><span>01</span><i /> <span>SEE THE SYSTEM</span></div>
        <h1><span className="ax-title-a">FINANCE</span><span className="ax-title-b">IN <em>FOCUS.</em></span></h1>
        <div className="ax-hero-deck"><p>Deja de perseguir cifras aisladas. Conecta rendimiento, planificación y caja para entender qué puede pasar después.</p><a className="ax-round-cta" href="#system"><span>EXPLORE<br />THE ATLAS</span><b>↘</b></a></div>
      </div>
      <div className="ax-hero-telemetry ax-telemetry-one"><small>MODEL / {active.label.toUpperCase()}</small><b>{active.revenue}</b><span>REVENUE · ILLUSTRATIVE</span></div>
      <div className="ax-hero-telemetry ax-telemetry-two"><small>OPERATING RESULT</small><b>{active.ebitda}</b><span>EBITDA · ILLUSTRATIVE</span></div>
      <div className="ax-hero-telemetry ax-telemetry-three"><small>LIQUIDITY POSITION</small><b>{active.cash}</b><span>CASH · ILLUSTRATIVE</span></div>
      <div className="ax-hero-bottom"><span><i className="ax-live-dot" /> SYSTEM READY / SAMPLE ENVIRONMENT</span><span>SCROLL TO CHANGE PERSPECTIVE ↓</span><span>01 / 10</span></div>
      <div className="ax-hero-orbit-label">A CLEARER VIEW<br /><em>OF WHAT'S NEXT.</em></div>
    </section>
  );
}

function Ribbon() {
  const words = ["MODEL THE FUTURE", "READ THE SIGNAL", "UNDERSTAND CASH", "DECIDE WITH CONTEXT"];
  return <section className="ax-ribbon" aria-label="Principios del producto"><div className="ax-ribbon-track">{[...words, ...words, ...words].map((word, i) => <span key={i}>{word}<b>✳</b></span>)}</div><div className="ax-ribbon-caption"><span>ENTERPRISEOS / OPERATING PRINCIPLES</span><span>NOT AN ERP. A FINANCIAL DECISION LAYER.</span></div></section>;
}

function Manifesto() {
  return <section className="ax-manifesto" id="signal">
    <div className="ax-section-stamp"><Eyebrow>02 / A DIFFERENT POINT OF VIEW</Eyebrow><span>THE SIGNAL / 001</span></div>
    <div className="ax-manifesto-layout">
      <div className="ax-manifesto-index">THE<br />NOISE<br /><i>↓</i><br />THE<br />SIGNAL</div>
      <h2>THE NUMBERS<br />ARE NOT THE<br /><em>WHOLE STORY.</em></h2>
      <div className="ax-manifesto-copy"><p>Una empresa produce miles de cifras. La ventaja aparece cuando entiendes cómo se relacionan: qué impulsa el resultado, qué cambia el plan y cuándo la caja empieza a tensionarse.</p><span>LESS REPORTING. MORE UNDERSTANDING.</span></div>
    </div>
    <div className="ax-manifesto-visual" aria-hidden="true"><div className="ax-contour ax-contour-a" /><div className="ax-contour ax-contour-b" /><div className="ax-contour ax-contour-c" /><div className="ax-signal-core"><span>EOS</span><i>MODEL<br />→ DECIDE</i></div><div className="ax-signal-coord">DATA / CONTEXT / CONSEQUENCE</div></div>
    <div className="ax-manifesto-foot"><span>01 — CONTEXT OVER NOISE</span><span>SCROLL-LED EDITORIAL FIELD</span></div>
  </section>;
}

function MiniVisual({ type }: { type: string }) {
  return <div className={"ax-mini-visual ax-mini-" + type} aria-hidden="true">
    {type === "bars" && <>{[38, 68, 48, 84, 58, 92, 73, 100].map((v, i) => <i key={i} style={{ height: v + "%" }} />)}</>}
    {type === "curves" && <svg viewBox="0 0 300 110"><path d="M0 90 C60 88 80 40 140 50 S220 8 300 12" /><path d="M0 90 C70 86 90 66 150 68 S230 48 300 54" /><path d="M0 90 C60 100 100 92 160 96 S240 88 300 98" /></svg>}
    {type === "wave" && <><div className="ax-wave-line" /><div className="ax-wave-bars">{[42,55,39,70,62,85,56,76,92,69,80,58,88].map((v,i)=><i key={i} style={{height:v+"%"}} />)}</div></>}
    {type === "ledger" && <>{["INVOICE  /  014","RECEIVABLE / 021","PAYABLE / 009","AGEING / 030"].map((x,i)=><span key={x}>{x}<b>{["€ 8.4k","€ 3.2k","€ 1.9k","14 d"][i]}</b></span>)}</>}
    {type === "nodes" && <><i /><i /><i /><i /><i /><i /></>}
    {type === "report" && <>{["REVENUE","OPERATING COST","EBITDA","CASH"].map((x,i)=><span key={x}>{x}<b>{["01","02","03","04"][i]}</b></span>)}</>}
    {type === "model" && <><b> P&L </b><i>↔</i><b>B/S</b><i>↔</i><b>CASH</b></>}
    {type === "control" && <><div className="ax-control-ring" /><span>INPUT</span><span>MODEL</span><span>OUTPUT</span></>}
  </div>;
}

function SystemGrid() {
  return <section className="ax-system" id="system">
    <div className="ax-section-stamp"><Eyebrow>03 / THE FINANCIAL SYSTEM</Eyebrow><span>8 MODULES / 4 DISCIPLINES</span></div>
    <div className="ax-system-heading"><h2>ONE SYSTEM.<br /><em>MULTIPLE LENSES.</em></h2><p>Una capa de planificación y análisis para conectar las preguntas financieras que importan. Cada módulo muestra su alcance actual, sin promesas ficticias.</p></div>
    <div className="ax-module-grid">{modules.map((m, i)=><article className={"ax-module ax-module-"+(i+1)} key={m.n}><div className="ax-module-top"><span>{m.n} / {m.code}</span><span>EOS FIELD</span></div><MiniVisual type={m.type}/><div className="ax-module-copy"><h3>{m.title}</h3><p>{m.desc}</p></div><div className="ax-module-bottom"><span>{m.stat}</span><b>↗</b></div></article>)}</div>
    <div className="ax-system-note"><span>CAPABILITY NOTE / 003</span><p>Los centros de coste, cobros, pagos y la previsión de tesorería dependen de datos introducidos manualmente. No existe conexión bancaria activa.</p></div>
  </section>;
}

function Anatomy() {
  return <section className="ax-anatomy" id="anatomy">
    <div className="ax-section-stamp"><Eyebrow>04 / UNDER THE SURFACE</Eyebrow><span>MODEL ANATOMY / EXPLODED VIEW</span></div>
    <div className="ax-anatomy-heading"><h2>FROM RAW INPUT<br />TO <em>BETTER JUDGEMENT.</em></h2><p>El valor no está en añadir otra pantalla. Está en hacer visible el recorrido entre una hipótesis y sus consecuencias.</p></div>
    <div className="ax-exploded">
      <div className="ax-exploded-axis"><span>Z / 04</span><i /><span>Z / 00</span></div>
      <div className="ax-layer ax-layer-output"><small>04 / DECISION LAYER</small><strong>READ THE OUTCOME</strong><span>Management view · Variance · Cash exposure</span><div className="ax-layer-glyph">↗</div></div>
      <div className="ax-layer ax-layer-forecast"><small>03 / FORECAST LAYER</small><strong>PROJECT THE FUTURE</strong><span>Scenarios · 13-week cash · Assumptions</span><div className="ax-layer-bars">{[25,48,38,72,55,88,68].map((h,i)=><i key={i} style={{height:h+"%"}} />)}</div></div>
      <div className="ax-layer ax-layer-model"><small>02 / MODEL LAYER</small><strong>CONNECT THE DRIVERS</strong><span>Revenue · Costs · Margins · Working capital</span><div className="ax-layer-grid" /></div>
      <div className="ax-layer ax-layer-input"><small>01 / INPUT LAYER</small><strong>DEFINE THE ASSUMPTIONS</strong><span>Manual inputs · Plans · Operating drivers</span><div className="ax-layer-dots">{Array.from({length:16},(_,i)=><i key={i}/>)}</div></div>
      <div className="ax-exploded-center">ENTERPRISE<span>OS</span><small>FINANCIAL LOGIC / MVP</small></div>
    </div>
    <div className="ax-anatomy-caption"><span>FIG 04.01 — CONCEPTUAL PRODUCT ARCHITECTURE</span><span>NOT A CLAIM OF AUTOMATED DATA INGESTION</span></div>
  </section>;
}

function Studio({ scenario, onChange }: { scenario: Scenario; onChange: (value: Scenario) => void }) {
  const active = scenarios[scenario];
  return <section className="ax-studio" id="studio">
    <div className="ax-section-stamp"><Eyebrow>05 / THE SCENARIO STUDIO</Eyebrow><span>INTERACTIVE / SYNTHETIC MODEL</span></div>
    <div className="ax-studio-heading"><h2>CHANGE THE<br /><em>ASSUMPTION.</em></h2><p>Una misma empresa de ejemplo. Tres hipótesis distintas. Explora cómo cambian ingresos, EBITDA y caja prevista.</p></div>
    <div className="ax-studio-console">
      <div className="ax-console-left"><div className="ax-console-label">SELECT A MODEL / 2026</div><div className="ax-scenario-selector">{(["conservador","base","crecimiento"] as Scenario[]).map((key,i)=><button key={key} className={scenario===key?"is-active":""} onClick={()=>onChange(key)} aria-pressed={scenario===key}><small>0{i+1}</small><span>{scenarios[key].label}</span><b>{scenario===key?"ACTIVE":"SELECT"}</b></button>)}</div><div className="ax-console-note"><span>MODEL NOTE</span><p>{active.note}</p></div><div className="ax-console-disclaimer">SYNTHETIC EXAMPLE · NOT CUSTOMER DATA · NOT LIVE CONNECTED</div></div>
      <div className="ax-console-right"><div className="ax-console-right-top"><span>OUTPUT / SCENARIO {active.label.toUpperCase()}</span><span><i /> MODEL UPDATED</span></div><div className="ax-output-metrics"><div><small>REVENUE</small><strong>{active.revenue}</strong><span>Annual projection</span></div><div><small>EBITDA</small><strong>{active.ebitda}</strong><span>Operating result</span></div><div><small>CASH POSITION</small><strong>{active.cash}</strong><span>Estimated position</span></div></div><div className="ax-output-chart"><div className="ax-chart-head"><span>RELATIVE INDEX / BASE = 100</span><span>ILLUSTRATIVE</span></div>{(["Ingresos","EBITDA","Caja"] as const).map((label,i)=><div className="ax-chart-row" key={label}><span>{label}</span><div><i style={{width:(active.bars[i]/140*100)+"%"}} /></div><b>{active.bars[i]}</b></div>)}</div><div className="ax-console-foot"><span>SCENARIO ENGINE / LOCAL DEMO</span><span>NO BANK FEED ACTIVE</span></div></div>
    </div>
  </section>;
}

function Dossiers() {
  const items = [
    { n:"A", title:"Revenue slows", desc:"¿Qué ocurre con el margen y la caja si las ventas crecen menos de lo previsto?", tag:"DOWNSIDE / PLANNING", color:"warm" },
    { n:"B", title:"Costs move first", desc:"¿Cuánto margen queda si la estructura de costes cambia antes que los ingresos?", tag:"COST BASE / SENSITIVITY", color:"cool" },
    { n:"C", title:"Cash gets tighter", desc:"¿Qué tensión aparece si los cobros se retrasan y los pagos mantienen su calendario?", tag:"WORKING CAPITAL / CASH", color:"violet" },
  ];
  return <section className="ax-dossiers" id="evidence">
    <div className="ax-section-stamp"><Eyebrow>06 / DECISION DOSSIERS</Eyebrow><span>ILLUSTRATIVE QUESTIONS / NOT CUSTOMER CASES</span></div>
    <div className="ax-dossiers-heading"><h2>BETTER QUESTIONS.<br /><em>BETTER DECISIONS.</em></h2><p>No publicamos logos, testimonios ni resultados de clientes que todavía no podemos demostrar. Empezamos por preguntas reales de dirección financiera.</p></div>
    <div className="ax-dossier-stack">{items.map(item=><article className={"ax-dossier ax-dossier-"+item.color} key={item.n}><div className="ax-dossier-visual"><span>{item.n}</span><div className="ax-dossier-orbit" /><i /><small>SCENARIO STUDY / 0{item.n.charCodeAt(0)-64}</small></div><div className="ax-dossier-copy"><span>{item.tag}</span><h3>{item.title}</h3><p>{item.desc}</p><a href="#studio">EXPLORE THE MODEL ↗</a></div></article>)}</div>
  </section>;
}

function Comparison() {
  const rows = [
    ["Management P&L", "Core workflow", "Accounting-led", "Planning-led"],
    ["Scenario modelling", "Available", "Varies by product", "Core capability"],
    ["13-week cash forecast", "Manual projection", "Depends on setup", "Often available"],
    ["Bank feeds", "Not available", "Available in some suites", "Depends on integration"],
    ["General ledger", "Not included", "Core accounting", "Usually connected"],
    ["Multi-entity controls", "Not available", "Product-dependent", "Advanced options"],
  ];
  return <section className="ax-comparison">
    <div className="ax-section-stamp"><Eyebrow>07 / POSITIONING, NOT POSTURING</Eyebrow><span>PRODUCT SCOPE MATRIX</span></div>
    <div className="ax-comparison-heading"><h2>KNOW WHAT<br />YOU'RE <em>CHOOSING.</em></h2><p>EnterpriseOS no pretende sustituir una suite contable o un FP&A maduro. Su foco actual es una capa ligera de planificación y lectura financiera.</p></div>
    <div className="ax-matrix-wrap"><table className="ax-matrix"><thead><tr><th>CAPABILITY</th><th>ENTERPRISEOS / MVP</th><th>SME BUSINESS SUITE</th><th>DEDICATED FP&A</th></tr></thead><tbody>{rows.map(row=><tr key={row[0]}>{row.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody></table></div>
    <div className="ax-comparison-foot"><span>POSITIONING GUIDE / NOT A VERIFIED VENDOR-BY-VENDOR AUDIT</span><span>PRODUCT SCOPE REVIEW / NOV 2026</span></div>
  </section>;
}

function WorkspacePreview() {
  return <section className="ax-workspace-section" id="workspace-preview">
    <div className="ax-section-stamp"><Eyebrow>08 / INSIDE THE PRODUCT</Eyebrow><span>REAL INTERACTIVE COMPONENT / SAMPLE DATA</span></div>
    <div className="ax-workspace-heading"><h2>NOT A RENDER.<br /><em>THE ACTUAL WORKSPACE.</em></h2><p>Esta vista utiliza el componente real de planificación. Puedes explorar sus controles; los cambios de la demo son temporales y no se guardan en tus datos.</p></div>
    <div className="ax-workspace-frame"><div className="ax-workspace-frame-top"><span>EOS / PLANNING WORKSPACE</span><span><i /> INTERACTIVE PREVIEW · SAMPLE DATA</span></div><PlanningWorkspace language="es" previewMode /><div className="ax-workspace-frame-bottom"><span>SESSION-ONLY CHANGES</span><span>MANUAL INPUTS · LOCAL DEMO</span></div></div>
  </section>;
}

function FinalPortal() {
  return <section className="ax-final">
    <div className="ax-final-orbit" aria-hidden="true"><div /><div /><div /><span>EOS</span></div>
    <div className="ax-final-content"><Eyebrow>09 / THE NEXT DECISION</Eyebrow><h2>SEE CLEARER.<br /><em>MOVE EARLIER.</em></h2><p>Explora el workspace y descubre cómo conectar planificación, rendimiento y tesorería en una sola lectura.</p><a href="/EnterpriseOS/" className="ax-final-cta"><span>ENTER THE WORKSPACE</span><b>↗</b></a></div>
    <div className="ax-final-bottom"><span>ENTERPRISEOS / THE FINANCIAL ATLAS</span><span>PLAN / MODEL / ANTICIPATE / DECIDE</span></div>
  </section>;
}

function Footer() {
  const [easter, setEaster] = useState(false);
  return <footer className="ax-footer">
    <div className="ax-footer-top"><a className="ax-wordmark" href="#top"><span className="ax-mark">E<span>O</span></span><span>ENTERPRISE<span>OS</span><small>FINANCIAL DECISION INTELLIGENCE</small></span></a><p>A clearer view of business performance, planning and cash.</p><button onClick={()=>setEaster(!easter)} aria-label="Mostrar mensaje oculto" className="ax-easter">✳</button></div>
    {easter && <div className="ax-easter-message">THE BEST FORECAST IS THE ONE YOU QUESTION. / EOS-001</div>}
    <div className="ax-footer-links"><a href="#signal">THE SIGNAL</a><a href="#system">THE SYSTEM</a><a href="#studio">SCENARIO STUDIO</a><a href="/EnterpriseOS/">OPEN WORKSPACE ↗</a></div>
    <div className="ax-footer-word">FINANCIAL<br /><em>CLARITY.</em></div>
    <div className="ax-footer-bottom"><span>© {new Date().getFullYear()} ENTERPRISEOS</span><span>MANUAL INPUTS / LOCAL PERSISTENCE / MVP SCOPE</span><span>MADE FOR BETTER DECISIONS.</span></div>
  </footer>;
}

export default function AtlasLanding() {
  const [scenario, setScenario] = useState<Scenario>("base");
  return <main className="ax-site" id="main-content">
    <a className="ax-skip" href="#signal">Saltar al contenido</a>
    <Preloader />
    <AtlasHeader />
    <Hero scenario={scenario} />
    <Ribbon />
    <Manifesto />
    <SystemGrid />
    <Anatomy />
    <Studio scenario={scenario} onChange={setScenario} />
    <Dossiers />
    <Comparison />
    <WorkspacePreview />
    <FinalPortal />
    <Footer />
  </main>;
}
