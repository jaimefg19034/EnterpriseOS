"use client";

import { useState } from "react";
import "./platform.css";

type Scenario = "conservador" | "base" | "crecimiento";
const scenarios: Record<Scenario, { label: string; revenue: string; ebitda: string; cash: string; bars: number[]; note: string; delta: string }> = {
  conservador: { label: "Conservador", revenue: "218.000 €", ebitda: "31.000 €", cash: "84.000 €", bars: [58, 36, 43], note: "Menor ritmo de ventas y presión sobre el margen. Revisa costes y necesidades de liquidez.", delta: "−12,1 %" },
  base: { label: "Base", revenue: "248.000 €", ebitda: "51.000 €", cash: "112.000 €", bars: [72, 61, 61], note: "Escenario de referencia para comparar el rendimiento esperado con otras hipótesis.", delta: "REFERENCIA" },
  crecimiento: { label: "Crecimiento", revenue: "286.000 €", ebitda: "68.000 €", cash: "139.000 €", bars: [88, 78, 78], note: "Un crecimiento más rápido mejora el resultado previsto, pero exige vigilar el capital circulante.", delta: "+15,3 %" }
};

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>;
}
function Mark() {
  return <span className="p-mark" aria-hidden="true"><i /><b /><em /></span>;
}
function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="p-section-label"><span>{number}</span><i />{children}</div>;
}
function DecisionField({ scenario }: { scenario: Scenario }) {
  const shift = scenario === "conservador" ? "field-down" : scenario === "crecimiento" ? "field-up" : "field-base";
  return (
    <div className={`p-field-visual ${shift}`} aria-label={`Visualización ilustrativa del escenario ${scenarios[scenario].label}`}>
      <div className="p-field-top"><span>EOS / DECISION FIELD</span><span>MODEL OUTPUT · ILLUSTRATIVE</span></div>
      <svg className="p-contours" viewBox="0 0 760 520" role="img" aria-label="Líneas topográficas que representan escenarios financieros">
        <defs>
          <linearGradient id="fieldStroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9aafff" stopOpacity=".08" /><stop offset=".48" stopColor="#b8c6ff" stopOpacity=".8" /><stop offset="1" stopColor="#62c4a4" stopOpacity=".3" /></linearGradient>
          <radialGradient id="fieldGlow"><stop stopColor="#9fb3ff" stopOpacity=".28" /><stop offset="1" stopColor="#9fb3ff" stopOpacity="0" /></radialGradient>
        </defs>
        <ellipse cx="390" cy="260" rx="300" ry="210" fill="url(#fieldGlow)" />
        <g fill="none" stroke="url(#fieldStroke)" strokeWidth="1.15">
          <path d="M-30 120 C90 8 180 45 255 104 S390 190 500 92 S690 15 800 95" />
          <path d="M-35 145 C85 32 182 68 258 128 S393 214 505 117 S690 42 805 120" />
          <path d="M-40 170 C82 57 184 92 262 152 S397 238 510 142 S694 68 810 145" />
          <path d="M-45 195 C80 82 188 117 266 176 S402 262 515 167 S698 94 815 170" />
          <path d="M-50 220 C78 108 191 142 270 200 S407 286 520 192 S702 120 820 195" />
          <path d="M-55 245 C75 134 194 167 274 224 S412 310 525 217 S706 146 825 220" />
          <path d="M-60 270 C73 160 197 192 278 248 S417 334 530 242 S710 172 830 245" />
          <path d="M-65 295 C70 186 200 217 282 272 S422 358 535 267 S714 198 835 270" />
          <path d="M-70 320 C68 212 203 242 286 296 S427 382 540 292 S718 224 840 295" />
          <path d="M-75 345 C65 238 206 267 290 320 S432 406 545 317 S722 250 845 320" />
          <path d="M-80 370 C63 264 209 292 294 344 S437 430 550 342 S726 276 850 345" />
          <path d="M-85 395 C60 290 212 317 298 368 S442 454 555 367 S730 302 855 370" />
          <path d="M90 520 C115 430 210 395 290 420 S425 495 520 440 S680 400 760 460" />
          <path d="M120 540 C145 450 228 420 305 443 S435 520 535 465 S690 428 780 488" />
        </g>
        <path className="p-field-route" d="M95 375 C180 335 215 245 315 265 S440 350 520 240 S620 175 680 145" />
        <circle cx="315" cy="265" r="7" fill="#b9c7ff" /><circle cx="315" cy="265" r="18" fill="none" stroke="#b9c7ff" strokeOpacity=".35" />
        <circle cx="680" cy="145" r="5" fill="#68c7a5" /><circle cx="680" cy="145" r="14" fill="none" stroke="#68c7a5" strokeOpacity=".35" />
      </svg>
      <div className="p-field-coordinate p-coordinate-a"><small>01 / MODEL</small><b>Revenue drivers</b><span>Volume · Price · Mix</span></div>
      <div className="p-field-coordinate p-coordinate-b"><small>02 / OUTLOOK</small><b>{scenarios[scenario].label}</b><span>{scenarios[scenario].delta}</span></div>
      <div className="p-field-coordinate p-coordinate-c"><small>03 / LIQUIDITY</small><b>13-week view</b><span>Cash position</span></div>
      <div className="p-field-legend"><i /> SCENARIO PATH <span>↗</span></div>
      <div className="p-field-bottom"><span>FINANCIAL TERRITORY / 001</span><span>MOVE THE ASSUMPTION. READ THE CONSEQUENCE.</span></div>
    </div>
  );
}

export default function PlatformPage() {
  const [scenario, setScenario] = useState<Scenario>("base");
  const active = scenarios[scenario];
  return (
    <main className="p-site">
      <header className="p-nav">
        <a className="p-brand" href="/EnterpriseOS/" aria-label="EnterpriseOS, abrir workspace"><Mark /><span>Enterprise<span>OS</span><small>FINANCE OPERATING SYSTEM</small></span></a>
        <nav aria-label="Navegación principal"><a href="#manifesto">Enfoque</a><a href="#capabilities">Capacidades</a><a href="#product">Producto</a><a href="#simulator">Escenarios</a></nav>
        <a className="p-nav-cta" href="/EnterpriseOS/">Abrir workspace <Arrow /></a>
      </header>

      <section className="p-hero">
        <div className="p-hero-index"><span>FINANCIAL DECISION INTELLIGENCE</span><span>EST. / 001</span></div>
        <div className="p-hero-copy">
          <div className="p-kicker"><i /> FINANZAS · PLANIFICACIÓN · DIRECCIÓN</div>
          <h1>El futuro<br />no se <em>adivina.</em><br /><span>Se modela.</span></h1>
          <p>Conecta planificación, resultados y tesorería para entender qué está ocurriendo y qué puede ocurrir después.</p>
          <div className="p-actions"><a className="p-button" href="/EnterpriseOS/">Explorar EnterpriseOS <Arrow /></a><a className="p-link" href="#product">Ver el producto <span>↓</span></a></div>
          <div className="p-hero-foot"><b>01 / 07</b><span>UN ESPACIO PARA PENSAR LAS FINANZAS<br />ANTES DE QUE DECIDAN POR TI.</span></div>
        </div>
        <DecisionField scenario={scenario} />
        <div className="p-hero-baseline"><span>MODEL / PLAN / ANTICIPATE / DECIDE</span><span>BUILT FOR CLEARER BUSINESS DECISIONS</span></div>
      </section>

      <section className="p-principles" aria-label="Principios de EnterpriseOS">
        <div className="p-principle-lead">UNA MEJOR LECTURA<br /><b>CAMBIA LA DECISIÓN.</b></div>
        {[[ "01", "Modelar", "Entender los motores del negocio" ], [ "02", "Planificar", "Contrastar hipótesis y escenarios" ], [ "03", "Anticipar", "Leer el impacto en caja" ], [ "04", "Decidir", "Actuar con contexto" ]].map(item => <div className="p-principle" key={item[0]}><small>{item[0]}</small><b>{item[1]}</b><span>{item[2]}</span></div>)}
      </section>

      <section className="p-manifesto" id="manifesto">
        <div className="p-manifesto-meta"><SectionLabel number="01">THE POINT OF VIEW</SectionLabel><span>AN ENTERPRISEOS PRINCIPLE</span></div>
        <h2>Una empresa genera<br />miles de cifras.<br /><em>Pero no todas</em><br /><span>cuentan la misma historia.</span></h2>
        <div className="p-manifesto-bottom"><p>El valor está en entender cómo se conectan: sus supuestos, su evolución, sus consecuencias y el margen de decisión que todavía existe.</p><span>01 — 04<br />CONTEXT OVER NOISE</span></div>
        <svg className="p-manifesto-lines" viewBox="0 0 520 520" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M260 5 C450 80 470 200 260 260 S70 440 260 515" /><path d="M260 30 C425 95 445 205 260 260 S95 425 260 490" /><path d="M260 55 C400 110 420 210 260 260 S120 410 260 465" /><path d="M260 80 C375 125 395 215 260 260 S145 395 260 440" /><path d="M260 105 C350 140 370 220 260 260 S170 380 260 415" /></g></svg>
      </section>

      <section className="p-proof">
        <div className="p-proof-heading"><SectionLabel number="02">A CLEARER STANDARD</SectionLabel><span>NO FICTION. JUST THE PRODUCT.</span></div>
        <div className="p-proof-grid">
          <div className="p-proof-intro"><h2>La confianza<br />empieza por<br /><em>la transparencia.</em></h2><p>Una herramienta financiera debe dejar claro qué sabe, qué estima y qué necesita que introduzcas.</p></div>
          <div className="p-proof-item"><span>01 / MODEL</span><b>Supuestos visibles</b><p>Las entradas del modelo y los resultados calculados se distinguen de forma explícita.</p><i>INPUTS → OUTPUTS</i></div>
          <div className="p-proof-item"><span>02 / FORECAST</span><b>Previsiones identificadas</b><p>Los escenarios y la tesorería proyectada se presentan como estimaciones, no como movimientos bancarios reales.</p><i>PLAN → OUTLOOK</i></div>
          <div className="p-proof-item"><span>03 / SCOPE</span><b>Alcance honesto</b><p>EnterpriseOS es actualmente un MVP de planificación y análisis, no un ERP ni una contabilidad conectada.</p><i>CLARITY → TRUST</i></div>
        </div>
      </section>

      <section className="p-capabilities" id="capabilities">
        <div className="p-cap-heading"><SectionLabel number="03">THE FINANCIAL SYSTEM</SectionLabel><span>FOUR CONNECTED DISCIPLINES</span></div>
        <div className="p-cap-intro"><h2>No más números<br />sin <em>contexto.</em></h2><p>Un espacio de trabajo que relaciona hipótesis, rendimiento y liquidez. Cada vista responde a una pregunta distinta del negocio.</p></div>
        <div className="p-cap-grid">
          <article className="p-cap p-cap-model"><div className="p-cap-meta"><span>01 / PERFORMANCE</span><b>MODEL</b></div><div className="p-cap-visual p-visual-model"><div className="p-mini-stat"><small>REVENUE / FY</small><strong>248.000<span> €</span></strong></div><div className="p-mini-bars">{[28,42,36,57,48,69,62,78,71,88,78,96].map((v,i)=><i key={i} style={{height:`${v}%`}} />)}</div><div className="p-mini-axis"><span>JAN</span><span>APR</span><span>JUL</span><span>OCT</span><span>DEC</span></div></div><div className="p-cap-copy"><h3>Modelización financiera</h3><p>Comprende cómo ingresos, costes, márgenes y supuestos construyen el resultado del negocio.</p><a href="/EnterpriseOS/">Explorar el modelo <Arrow /></a></div></article>
          <article className="p-cap p-cap-planning"><div className="p-cap-meta"><span>02 / PLANNING</span><b>SCENARIOS</b></div><div className="p-cap-visual p-visual-planning"><div className="p-scenario-lines"><span>GROWTH <i /></span><span>BASE <i /></span><span>DOWNSIDE <i /></span></div><div className="p-scenario-axis"><span>NOW</span><span>FY 2026</span><span>OUTLOOK</span></div></div><div className="p-cap-copy"><h3>Presupuestos y escenarios</h3><p>Compara hipótesis y entiende cómo cambian las previsiones antes de comprometer recursos.</p><a href="/EnterpriseOS/">Explorar planificación <Arrow /></a></div></article>
          <article className="p-cap p-cap-cash"><div className="p-cap-meta"><span>03 / LIQUIDITY</span><b>13 WEEKS</b></div><div className="p-cap-visual p-visual-cash"><div className="p-cash-heading"><small>WEEKLY CASH OUTLOOK</small><strong>13 <i>WEEKS</i></strong></div><div className="p-cash-track">{[54,67,49,76,62,82,69,73,57,88,72,94,81].map((v,i)=><i key={i} style={{height:`${v}%`}} />)}</div><div className="p-cash-axis"><span>W01</span><span>W06</span><span>W13</span></div></div><div className="p-cap-copy"><h3>Previsión de tesorería</h3><p>Visualiza cobros, pagos y evolución prevista de caja para anticipar tensiones de liquidez.</p><a href="/EnterpriseOS/">Explorar tesorería <Arrow /></a></div></article>
          <article className="p-cap p-cap-report"><div className="p-cap-meta"><span>04 / REPORTING</span><b>STATEMENTS</b></div><div className="p-cap-visual p-visual-report"><div className="p-report-sheet"><small>MANAGEMENT P&L <span>FY / 2026</span></small>{[[ "Revenue", "248,000" ],[ "Operating costs", "(184,700)" ],[ "EBITDA", "63,300" ],[ "Net income", "35,100" ]].map(row=><div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}<small>MODEL OUTPUT <span>EUR</span></small></div></div><div className="p-cap-copy"><h3>Estados e informes</h3><p>Lee estados financieros y métricas de gestión desde una estructura común.</p><a href="/EnterpriseOS/">Explorar informes <Arrow /></a></div></article>
        </div>
        <p className="p-disclaimer"><b>DATA NOTE</b> Las visualizaciones y cifras de esta página son ilustrativas; no representan datos de una empresa conectada.</p>
      </section>

      <section className="p-product" id="product">
        <div className="p-product-heading"><SectionLabel number="04">INSIDE THE WORKSPACE</SectionLabel><span>ONE MODEL. DIFFERENT QUESTIONS.</span></div>
        <div className="p-product-intro"><h2>No te enseñamos<br />una lista de funciones.<br /><em>Te enseñamos</em><br />cómo se conectan.</h2><p>Desde las hipótesis que alimentan el modelo hasta la lectura de resultados y la previsión de caja.</p></div>
        <div className="p-product-stage">
          <div className="p-stage-sidebar"><div className="p-stage-brand"><Mark /><span>EnterpriseOS</span></div><small>FINANCE WORKSPACE</small><div className="p-stage-nav active"><i /> Overview</div><div className="p-stage-nav"><i /> Planning</div><div className="p-stage-nav"><i /> Statements</div><div className="p-stage-nav"><i /> Cash forecast</div><div className="p-stage-nav"><i /> Reports</div><div className="p-stage-sidebar-foot">LOCAL DEMO<br />SAMPLE DATA</div></div>
          <div className="p-stage-main"><div className="p-stage-top"><span>WORKSPACE / OVERVIEW</span><span>FY 2026 · EUR</span></div><div className="p-stage-title"><div><small>FINANCIAL PERFORMANCE</small><h3>Management overview</h3></div><span className="p-stage-status"><i /> MODEL READY</span></div><div className="p-stage-kpis"><div><small>REVENUE</small><b>248.000 €</b><span>Current model</span></div><div><small>EBITDA</small><b>51.000 €</b><span>Calculated output</span></div><div><small>NET INCOME</small><b>35.100 €</b><span>Illustrative model</span></div></div><div className="p-stage-lower"><div className="p-stage-chart"><div><small>REVENUE DEVELOPMENT</small><span>ILLUSTRATIVE TREND</span></div><svg viewBox="0 0 500 170" aria-hidden="true"><path className="p-stage-gridline" d="M0 35H500M0 80H500M0 125H500" /><path className="p-stage-area" d="M0 142 C45 128 60 112 95 120 S150 90 190 100 S245 65 285 79 S345 49 380 61 S450 24 500 28 V170 H0Z" /><path className="p-stage-line" d="M0 142 C45 128 60 112 95 120 S150 90 190 100 S245 65 285 79 S345 49 380 61 S450 24 500 28" /></svg><div className="p-stage-axis"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div></div><div className="p-stage-bridge"><small>PROFITABILITY BRIDGE</small><b>Where revenue goes</b><div><span>Revenue</span><strong>248.000 €</strong></div><div><span>Direct & operating costs</span><strong>−197.000 €</strong></div><div className="p-bridge-total"><span>EBITDA</span><strong>51.000 €</strong></div></div></div><div className="p-stage-foot"><span>MODEL / PLAN / REVIEW</span><span>DEMONSTRATION VIEW · NOT LIVE DATA</span></div></div>
        </div>
        <div className="p-product-caption"><span>FIG. 04 — MANAGEMENT WORKSPACE</span><span>VISUAL REPRESENTATION OF THE CURRENT MVP SCOPE</span></div>
      </section>

      <section className="p-simulator" id="simulator">
        <div className="p-sim-copy"><SectionLabel number="05">THE DECISION FIELD</SectionLabel><h2>Un supuesto cambia.<br /><em>La perspectiva también.</em></h2><p>Un modelo financiero sirve cuando permite explorar consecuencias. Cambia la hipótesis y observa cómo varía esta demostración ilustrativa.</p><div className="p-switch" role="group" aria-label="Seleccionar escenario">{(Object.keys(scenarios) as Scenario[]).map(key => <button key={key} onClick={() => setScenario(key)} className={scenario === key ? "active" : ""} aria-pressed={scenario === key}>{scenarios[key].label}</button>)}</div><div className="p-note" aria-live="polite"><span>↳</span>{active.note}</div></div>
        <div className="p-sim-panel"><div className="p-sim-top"><span>ILLUSTRATIVE MODEL / 2026</span><b><i /> SCENARIO ACTIVE</b></div><div className="p-values"><div><small>INGRESOS</small><strong>{active.revenue}</strong><span>Proyección anual</span></div><div><small>EBITDA</small><strong>{active.ebitda}</strong><span>Resultado operativo</span></div><div><small>CAJA PREVISTA</small><strong>{active.cash}</strong><span>Posición estimada</span></div></div><div className="p-sim-bars">{[[ "Ingresos", active.bars[0] ],[ "EBITDA", active.bars[1] ],[ "Liquidez", active.bars[2] ]].map(row=><div key={row[0]}><span>{row[0]}</span><i><b style={{ width: `${row[1]}%` }} /></i></div>)}</div><div className="p-sim-foot"><span>BASE / DOWNSIDE / UPSIDE</span><span>NO LIVE DATA CONNECTED</span></div></div>
      </section>

      <section className="p-architecture">
        <div className="p-architecture-head"><SectionLabel number="06">FROM INPUT TO DECISION</SectionLabel><span>THE LOGIC OF THE SYSTEM</span></div>
        <div className="p-architecture-main"><h2>La diferencia no está<br />en tener más números.<br /><em>Está en entender</em><br />qué los mueve.</h2><div className="p-architecture-flow">{[[ "01", "INPUTS", "Drivers & assumptions" ],[ "02", "MODEL", "Financial logic" ],[ "03", "OUTLOOK", "Scenarios & cash" ],[ "04", "DECISION", "Management view" ]].map((row,i)=><div className="p-flow-node" key={row[0]}><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small>{i!==3&&<i>→</i>}</div>)}</div></div>
        <div className="p-comparison"><div><span>FRAGMENTED APPROACH</span><b>Hojas y modelos separados</b><p>Revisiones manuales y contexto repartido entre documentos.</p></div><div className="p-comparison-arrow">→</div><div><span>ENTERPRISEOS APPROACH</span><b>Una lectura financiera conectada</b><p>Un espacio para relacionar supuestos, resultados y previsiones.</p></div></div>
        <p className="p-scope-note">ALCANCE ACTUAL · EnterpriseOS es un MVP de planificación y análisis financiero con entradas manuales y persistencia local. No incluye todavía libro mayor, conexión bancaria automática ni presentación fiscal.</p>
      </section>

      <section className="p-cta">
        <div className="p-cta-meta"><span>ENTERPRISEOS / NEXT STEP</span><span>07 — 07</span></div>
        <div className="p-cta-main"><h2>La próxima decisión<br />merece una <em>mejor perspectiva.</em></h2><p>Explora un espacio de trabajo diseñado para modelar, planificar y entender mejor las finanzas de tu empresa.</p><a className="p-button p-button-light" href="/EnterpriseOS/">Entrar en EnterpriseOS <Arrow /></a></div>
        <div className="p-cta-seal"><b>EOS</b><span>PLAN<br />MODEL<br />DECIDE</span></div>
        <svg className="p-cta-contours" viewBox="0 0 500 360" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M-20 260 C80 60 200 30 290 140 S420 280 520 80" /><path d="M-20 280 C80 80 200 50 290 160 S420 300 520 100" /><path d="M-20 300 C80 100 200 70 290 180 S420 320 520 120" /><path d="M-20 320 C80 120 200 90 290 200 S420 340 520 140" /><path d="M-20 340 C80 140 200 110 290 220 S420 360 520 160" /></g></svg>
      </section>

      <footer className="p-footer"><div className="p-footer-main"><a className="p-brand" href="/EnterpriseOS/"><Mark /><span>Enterprise<span>OS</span><small>FINANCE OPERATING SYSTEM</small></span></a><p>Un espacio de trabajo para planificar, analizar y dirigir.</p></div><div className="p-footer-links"><div><small>EXPLORE</small><a href="#manifesto">Enfoque</a><a href="#capabilities">Capacidades</a><a href="#product">Producto</a></div><div><small>WORKSPACE</small><a href="/EnterpriseOS/">Abrir aplicación <Arrow /></a><a href="#simulator">Simulador</a></div></div><div className="p-footer-bottom"><span>© 2026 ENTERPRISEOS</span><span>PLAN / MODEL / ANTICIPATE / DECIDE</span><span>DEMO · LOCAL DATA · ILLUSTRATIVE CONTENT</span></div></footer>
    </main>
  );
}
