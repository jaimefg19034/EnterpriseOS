"use client";
import { useState } from "react";
import "./platform.css";

type Scenario = "conservador" | "base" | "crecimiento";
const scenarios: Record<Scenario,{label:string;revenue:string;ebitda:string;cash:string;bars:number[];note:string}> = {
  conservador:{label:"Conservador",revenue:"218.000 €",ebitda:"31.000 €",cash:"84.000 €",bars:[58,36,43],note:"Menor ritmo de ventas y presión sobre el margen. Revisa costes y necesidades de liquidez."},
  base:{label:"Base",revenue:"248.000 €",ebitda:"51.000 €",cash:"112.000 €",bars:[72,61,61],note:"Escenario de referencia para comparar el rendimiento esperado con otras hipótesis."},
  crecimiento:{label:"Crecimiento",revenue:"286.000 €",ebitda:"68.000 €",cash:"139.000 €",bars:[88,78,78],note:"Un crecimiento más rápido mejora el resultado previsto, pero exige vigilar el capital circulante."}
};
function Arrow(){return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5"/></svg>}
function Mark(){return <span className="p-mark"><i/><b/><em/></span>}
export default function PlatformPage(){
 const [scenario,setScenario]=useState<Scenario>("base"),active=scenarios[scenario];
 return <main className="p-site">
  <header className="p-nav">
   <a className="p-brand" href="/"><Mark/><span>Enterprise<span>OS</span><small>FINANCE OPERATING SYSTEM</small></span></a>
   <nav><a href="#vision">Enfoque</a><a href="#capabilities">Capacidades</a><a href="#method">Simulador</a></nav>
   <a className="p-nav-cta" href="/">Abrir workspace <Arrow/></a>
  </header>
  <section className="p-hero">
   <div className="p-hero-copy">
    <div className="p-kicker"><i/> FINANZAS · PLANIFICACIÓN · DIRECCIÓN</div>
    <h1>Dirige con<br/><i>claridad</i><br/>financiera.</h1>
    <p>Convierte modelos, presupuestos y previsiones en una visión coherente de lo que está pasando y de lo que puede pasar después.</p>
    <div className="p-actions"><a className="p-button" href="/">Explorar EnterpriseOS <Arrow/></a><a className="p-link" href="#capabilities">Descubrir el enfoque ↓</a></div>
    <div className="p-hero-foot"><b>01 / 04</b><span>Un espacio de trabajo para pensar las finanzas<br/>antes de que decidan por ti.</span></div>
   </div>
   <div className="p-hero-art">
    <div className="p-art-meta"><span>ENTERPRISEOS / FINANCIAL VIEW</span><span>FIG. 01 — MODEL OVERVIEW</span></div>
    <div className="p-orbit o1"/><div className="p-orbit o2"/>
    <div className="p-core"><small>FINANCIAL POSITION</small><strong>01<span>—</span></strong><i/><small>MODEL / PLAN / DECIDE</small></div>
    <div className="p-node n1"><small>01 / MODEL</small><b>Assumptions</b><span>Revenue · Costs · Margin</span></div>
    <div className="p-node n2"><small>02 / FORECAST</small><b>Scenarios</b><span>Base · Downside · Growth</span></div>
    <div className="p-node n3"><small>03 / CONTROL</small><b>Cash outlook</b><span>13-week visibility</span></div>
    <div className="p-art-foot"><span>DECISION INTELLIGENCE</span><span>ES / EN</span></div>
   </div>
  </section>
  <section className="p-principles"><div>MENOS FRAGMENTACIÓN.<br/><b>MÁS CONTEXTO.</b></div>{[["01","Modelar","Entender los motores del negocio"],["02","Planificar","Contrastar hipótesis y escenarios"],["03","Anticipar","Leer el impacto en caja y resultados"],["04","Decidir","Actuar con una visión conectada"]].map(x=><div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b><span>{x[2]}</span></div>)}</section>
  <section className="p-vision" id="vision">
   <div className="p-section-label"><b>02</b><i/> EL ENFOQUE</div>
   <div className="p-vision-grid"><h2>La gestión financiera no debería ser una colección de <i>pantallas inconexas.</i></h2><div><p>Una cifra aislada explica poco. Una cifra conectada con sus supuestos, su evolución y sus consecuencias permite decidir.</p><p>EnterpriseOS reúne planificación y análisis en un mismo espacio, sin disfrazar estimaciones de datos reales.</p><a href="/">Conocer el workspace <Arrow/></a></div></div>
   <div className="p-editorial"><div><small>THE FINANCIAL PICTURE</small><h3>Del dato<br/>a la <i>decisión.</i></h3><p>Una lectura conectada de rendimiento, hipótesis y liquidez.</p></div><div className="p-flow">{[["01","INPUTS","Drivers & assumptions"],["02","MODEL","Financial logic"],["03","OUTLOOK","Scenarios & cash"],["04","DECISION","Management view"]].map(x=><div key={x[0]}><b>{x[0]}</b><strong>{x[1]}</strong><small>{x[2]}</small></div>)}</div><label>EOS<br/><small>EST. FOR BETTER DECISIONS</small></label></div>
  </section>
  <section className="p-capabilities" id="capabilities">
   <div className="p-section-label"><b>03</b><i/> CAPACIDADES</div>
   <div className="p-cap-heading"><h2>Todo empieza<br/>por <i>ver mejor.</i></h2><p>Herramientas conectadas por una misma pregunta: ¿qué significa este número para el siguiente movimiento?</p></div>
   <div className="p-cap-grid">
    <article className="p-cap p-cap-main"><div className="p-cap-meta">01 / PERFORMANCE <b>01—</b></div><div className="p-chart"><small>REVENUE / EBITDA / TREND</small><div className="p-bars">{[39,54,48,65,59,73,67,83,74,91,84,98].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div><div className="p-axis"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div></div><div className="p-cap-copy"><h3>Modelización financiera</h3><p>Comprende cómo ingresos, costes, márgenes y supuestos construyen el resultado del negocio.</p><a href="/">Explorar el modelo <Arrow/></a></div></article>
    <article className="p-cap"><div className="p-cap-meta">02 / PLANNING <b>02—</b></div><div className="p-scenario-art"><div><small>SCENARIO MATRIX</small><b>BASE <i>↗</i></b><b>DOWNSIDE <i>↘</i></b><b>GROWTH <i>↗</i></b></div></div><div className="p-cap-copy"><h3>Presupuestos y escenarios</h3><p>Compara hipótesis y entiende cómo cambian las previsiones antes de comprometer recursos.</p><a href="/">Explorar planificación <Arrow/></a></div></article>
    <article className="p-cap"><div className="p-cap-meta">03 / LIQUIDITY <b>03—</b></div><div className="p-cash-art"><small>13-WEEK CASH OUTLOOK</small><div>{[45,62,51,75,60,82,68,73,56,86,76,94,80].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div><span>INFLOWS　 OUTFLOWS　 NET CASH</span></div><div className="p-cap-copy"><h3>Previsión de tesorería</h3><p>Visualiza cobros, pagos y evolución prevista de caja para anticipar tensiones de liquidez.</p><a href="/">Explorar tesorería <Arrow/></a></div></article>
    <article className="p-cap"><div className="p-cap-meta">04 / REPORTING <b>04—</b></div><div className="p-statement-art"><div><small>FINANCIAL STATEMENTS <span>FY / 2026</span></small>{[["Revenue","248,000"],["Operating costs","(184,700)"],["EBITDA","63,300"],["Net income","35,100"]].map(x=><p key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></p>)}<small>MODEL OUTPUT <span>EUR</span></small></div></div><div className="p-cap-copy"><h3>Estados e informes</h3><p>Lee la cuenta de resultados, el balance y las métricas operativas desde una estructura común.</p><a href="/">Explorar informes <Arrow/></a></div></article>
   </div>
   <p className="p-disclaimer"><b>NOTA</b> Las visualizaciones y cifras de esta página son ilustrativas; no representan datos de una empresa conectada.</p>
  </section>
  <section className="p-simulator" id="method">
   <div className="p-sim-copy"><div className="p-section-label"><b>04</b><i/> CAMBIA LA HIPÓTESIS</div><h2>Un supuesto cambia.<br/><i>La perspectiva también.</i></h2><p>Un modelo financiero sirve cuando permite explorar consecuencias. Prueba tres hipótesis ilustrativas y observa cómo cambia la lectura del negocio.</p><div className="p-switch" role="group" aria-label="Seleccionar escenario">{(Object.keys(scenarios) as Scenario[]).map(k=><button key={k} onClick={()=>setScenario(k)} className={scenario===k?"active":""} aria-pressed={scenario===k}>{scenarios[k].label}</button>)}</div><div className="p-note">↳　{active.note}</div></div>
   <div className="p-sim-panel" aria-live="polite"><div className="p-sim-top"><span>ILLUSTRATIVE MODEL / 2026</span><b>● SCENARIO ACTIVE</b></div><div className="p-values">{[["INGRESOS",active.revenue,"Proyección anual"],["EBITDA",active.ebitda,"Resultado operativo"],["CAJA PREVISTA",active.cash,"Posición estimada"]].map(x=><div key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong><span>{x[2]}</span></div>)}</div><div className="p-sim-bars">{["Ingresos","EBITDA","Liquidez"].map((x,i)=><div key={x}><span>{x}</span><i><b style={{width:active.bars[i]+"%"}}/></i></div>)}</div><div className="p-sim-foot"><span>BASE / DOWNSIDE / UPSIDE</span><span>NO LIVE DATA CONNECTED</span></div></div>
  </section>
  <section className="p-difference"><div className="p-section-label"><b>05</b><i/> UNA FORMA DISTINTA DE TRABAJAR</div><div className="p-diff-grid"><h2>Menos hojas aisladas.<br/><i>Más contexto financiero.</i></h2><div>{[["01","De cifras dispersas","Modelos, presupuestos y previsiones en documentos separados."],["02","A una lectura conectada","Un espacio de trabajo que relaciona hipótesis, resultados y caja."],["03","De reaccionar tarde","Revisar las consecuencias de diferentes escenarios antes de decidir."]].map(x=><article key={x[0]}><small>{x[0]}</small><div><b>{x[1]}</b><p>{x[2]}</p></div><span>↗</span></article>)}</div></div><div className="p-diff-foot"><span>NO ES CONTABILIDAD AUTOMÁTICA.</span><span>ES PLANIFICACIÓN Y ANÁLISIS FINANCIERO.</span></div></section>
  <section className="p-cta"><small>ENTERPRISEOS / NEXT STEP</small><div><h2>La próxima decisión<br/>empieza <i>con perspectiva.</i></h2><p>Explora un espacio de trabajo diseñado para modelar, planificar y entender mejor las finanzas de tu empresa.</p><a className="p-button" href="/">Entrar en EnterpriseOS <Arrow/></a></div><div className="p-cta-orbit"><b>EOS</b><small>FINANCE<br/>OPERATING<br/>SYSTEM</small></div></section>
  <footer className="p-footer"><a className="p-brand" href="/"><Mark/><span>Enterprise<span>OS</span><small>FINANCE OPERATING SYSTEM</small></span></a><p>Un espacio de trabajo para planificar, analizar y dirigir.</p><div><a href="#vision">Enfoque</a><a href="#capabilities">Capacidades</a><a href="/">Abrir aplicación <Arrow/></a></div><small>© 2026 ENTERPRISEOS　　PLAN / ANALYSE / DECIDE　　DEMO · LOCAL DATA</small></footer>
 </main>
}
