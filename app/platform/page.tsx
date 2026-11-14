"use client";

import { useEffect, useState } from "react";
import "./platform.css";
import Arrow from "../components/ui/Arrow";
import BrandMark from "../components/ui/BrandMark";
import TechnicalLabel from "../components/ui/TechnicalLabel";
import PlatformHeader from "./components/PlatformHeader";
import PlatformFooter from "./components/PlatformFooter";
import EditorialHero from "./components/EditorialHero";
import ManifestoSection from "./components/ManifestoSection";
import TrustSection from "./components/TrustSection";
import { scenarios, type Scenario } from "./components/scenarios";

export default function PlatformPage() {
  const [scenario, setScenario] = useState<Scenario>("base");
  const [introReady, setIntroReady] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setIntroReady(true), 520); return () => window.clearTimeout(timer); }, []);
  const active = scenarios[scenario];
  return (
    <main className={introReady ? "p-site p-loaded" : "p-site"}>
      <div className="p-preloader" aria-hidden={introReady}><BrandMark /><span>ENTERPRISEOS</span><i /></div>
      <PlatformHeader />

      <EditorialHero scenario={scenario} />

      <section className="p-principles" aria-label="Principios de EnterpriseOS">
        <div className="p-principle-lead">UNA MEJOR LECTURA<br /><b>CAMBIA LA DECISIÓN.</b></div>
        {[[ "01", "Modelar", "Entender los motores del negocio" ], [ "02", "Planificar", "Contrastar hipótesis y escenarios" ], [ "03", "Anticipar", "Leer el impacto en caja" ], [ "04", "Decidir", "Actuar con contexto" ]].map(item => <div className="p-principle" key={item[0]}><small>{item[0]}</small><b>{item[1]}</b><span>{item[2]}</span></div>)}
      </section>

      <ManifestoSection />

      <TrustSection />

      <section className="p-capabilities" id="capabilities">
        <div className="p-cap-heading"><TechnicalLabel number="03">THE FINANCIAL SYSTEM</SectionLabel><span>FOUR CONNECTED DISCIPLINES</span></div>
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
        <div className="p-product-heading"><TechnicalLabel number="04">INSIDE THE WORKSPACE</SectionLabel><span>ONE MODEL. DIFFERENT QUESTIONS.</span></div>
        <div className="p-product-intro"><h2>No te enseñamos<br />una lista de funciones.<br /><em>Te enseñamos</em><br />cómo se conectan.</h2><p>Desde las hipótesis que alimentan el modelo hasta la lectura de resultados y la previsión de caja.</p></div>
        <div className="p-product-stage">
          <div className="p-stage-sidebar"><div className="p-stage-brand"><BrandMark /><span>EnterpriseOS</span></div><small>FINANCE WORKSPACE</small><div className="p-stage-nav active"><i /> Overview</div><div className="p-stage-nav"><i /> Planning</div><div className="p-stage-nav"><i /> Statements</div><div className="p-stage-nav"><i /> Cash forecast</div><div className="p-stage-nav"><i /> Reports</div><div className="p-stage-sidebar-foot">LOCAL DEMO<br />SAMPLE DATA</div></div>
          <div className="p-stage-main"><div className="p-stage-top"><span>WORKSPACE / OVERVIEW</span><span>FY 2026 · EUR</span></div><div className="p-stage-title"><div><small>FINANCIAL PERFORMANCE</small><h3>Management overview</h3></div><span className="p-stage-status"><i /> MODEL READY</span></div><div className="p-stage-kpis"><div><small>REVENUE</small><b>248.000 €</b><span>Current model</span></div><div><small>EBITDA</small><b>51.000 €</b><span>Calculated output</span></div><div><small>NET INCOME</small><b>35.100 €</b><span>Illustrative model</span></div></div><div className="p-stage-lower"><div className="p-stage-chart"><div><small>REVENUE DEVELOPMENT</small><span>ILLUSTRATIVE TREND</span></div><svg viewBox="0 0 500 170" aria-hidden="true"><path className="p-stage-gridline" d="M0 35H500M0 80H500M0 125H500" /><path className="p-stage-area" d="M0 142 C45 128 60 112 95 120 S150 90 190 100 S245 65 285 79 S345 49 380 61 S450 24 500 28 V170 H0Z" /><path className="p-stage-line" d="M0 142 C45 128 60 112 95 120 S150 90 190 100 S245 65 285 79 S345 49 380 61 S450 24 500 28" /></svg><div className="p-stage-axis"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div></div><div className="p-stage-bridge"><small>PROFITABILITY BRIDGE</small><b>Where revenue goes</b><div><span>Revenue</span><strong>248.000 €</strong></div><div><span>Direct & operating costs</span><strong>−197.000 €</strong></div><div className="p-bridge-total"><span>EBITDA</span><strong>51.000 €</strong></div></div></div><div className="p-stage-foot"><span>MODEL / PLAN / REVIEW</span><span>DEMONSTRATION VIEW · NOT LIVE DATA</span></div></div>
        </div>
        <div className="p-product-caption"><span>FIG. 04 — MANAGEMENT WORKSPACE</span><span>VISUAL REPRESENTATION OF THE CURRENT MVP SCOPE</span></div>
      </section>

      <section className="p-simulator" id="simulator">
        <div className="p-sim-copy"><TechnicalLabel number="05">THE DECISION FIELD</SectionLabel><h2>Un supuesto cambia.<br /><em>La perspectiva también.</em></h2><p>Un modelo financiero sirve cuando permite explorar consecuencias. Cambia la hipótesis y observa cómo varía esta demostración ilustrativa.</p><div className="p-switch" role="group" aria-label="Seleccionar escenario">{(Object.keys(scenarios) as Scenario[]).map(key => <button key={key} onClick={() => setScenario(key)} className={scenario === key ? "active" : ""} aria-pressed={scenario === key}>{scenarios[key].label}</button>)}</div><div className="p-note" aria-live="polite"><span>↳</span>{active.note}</div></div>
        <div className="p-sim-panel"><div className="p-sim-top"><span>ILLUSTRATIVE MODEL / 2026</span><b><i /> SCENARIO ACTIVE</b></div><div className="p-values"><div><small>INGRESOS</small><strong>{active.revenue}</strong><span>Proyección anual</span></div><div><small>EBITDA</small><strong>{active.ebitda}</strong><span>Resultado operativo</span></div><div><small>CAJA PREVISTA</small><strong>{active.cash}</strong><span>Posición estimada</span></div></div><div className="p-sim-bars">{[[ "Ingresos", active.bars[0] ],[ "EBITDA", active.bars[1] ],[ "Liquidez", active.bars[2] ]].map(row=><div key={row[0]}><span>{row[0]}</span><i><b style={{ width: `${row[1]}%` }} /></i></div>)}</div><div className="p-sim-foot"><span>BASE / DOWNSIDE / UPSIDE</span><span>NO LIVE DATA CONNECTED</span></div></div>
      </section>

      <section className="p-architecture">
        <div className="p-architecture-head"><TechnicalLabel number="06">FROM INPUT TO DECISION</SectionLabel><span>THE LOGIC OF THE SYSTEM</span></div>
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

      <PlatformFooter />
    </main>
  );
}
