import type { PointerEvent } from "react";
import Arrow from "../../components/ui/Arrow";
import TechnicalLabel from "../../components/ui/TechnicalLabel";

const disciplines = [
  {
    number: "01",
    code: "PERFORMANCE / MODEL",
    title: "Entender el resultado.",
    description: "Relaciona ingresos, estructura de costes y márgenes para leer qué está impulsando el rendimiento del negocio.",
    className: "p-discipline-performance",
    visual: "model",
    modules: [["P&L de gestión", "LECTURA DEL RESULTADO"], ["Centros de coste", "SEGUIMIENTO MANUAL"]],
  },
  {
    number: "02",
    code: "PLANNING / SCENARIOS",
    title: "Poner a prueba el futuro.",
    description: "Construye presupuestos y contrasta escenarios para medir el efecto de distintas hipótesis antes de decidir.",
    className: "p-discipline-planning",
    visual: "scenarios",
    modules: [["Presupuesto", "PLAN Y VARIACIONES"], ["Escenarios", "COMPARACIÓN DE HIPÓTESIS"]],
  },
  {
    number: "03",
    code: "LIQUIDITY / 13 WEEKS",
    title: "Ver venir la tensión de caja.",
    description: "Proyecta cobros, pagos y saldo de tesorería en un horizonte móvil de trece semanas.",
    className: "p-discipline-liquidity",
    visual: "liquidity",
    modules: [["Caja · 13 semanas", "PREVISIÓN MANUAL"], ["Cobros y pagos", "VENCIMIENTOS Y ANTIGÜEDAD"]],
  },
  {
    number: "04",
    code: "REPORTING / MANAGEMENT",
    title: "Leer el negocio con criterio.",
    description: "Consulta los informes de gestión disponibles y exporta los resultados del modelo.",
    className: "p-discipline-reporting",
    visual: "reporting",
    modules: [["Informes de gestión", "ALCANCE MVP"], ["Exportación Excel", "DESCARGA DE RESULTADOS"]],
  },
];

function DisciplineVisual({ type }: { type: string }) {
  if (type === "model") {
    return (
      <div className="p-discipline-visual p-discipline-model" aria-hidden="true">
        <div className="p-model-equation"><span>REVENUE</span><i>−</i><span>COSTS</span><i>=</i><b>RESULT</b></div>
        <div className="p-model-flow"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <div className="p-model-axis"><span>ACTUAL</span><span>PLAN</span><span>VARIANCE</span></div>
      </div>
    );
  }
  if (type === "scenarios") {
    return (
      <div className="p-discipline-visual p-discipline-scenarios" aria-hidden="true">
        <div className="p-scenario-legend"><span><i /> UPSIDE</span><span><i /> BASE</span><span><i /> DOWNSIDE</span></div>
        <svg viewBox="0 0 520 150" role="presentation">
          <path d="M0 116 C70 110 95 100 150 91 S245 72 300 48 S410 25 520 10" />
          <path d="M0 116 C80 110 110 104 170 98 S260 84 330 78 S440 70 520 64" />
          <path d="M0 116 C75 118 110 122 170 126 S280 132 350 137 S450 142 520 147" />
          <path className="p-scenario-origin" d="M0 0V150" />
        </svg>
        <div className="p-scenario-axis"><span>STARTING POINT</span><span>MODELLED OUTLOOK →</span></div>
      </div>
    );
  }
  if (type === "liquidity") {
    return (
      <div className="p-discipline-visual p-discipline-liquidity-chart" aria-hidden="true">
        <div className="p-liquidity-label"><span>ROLLING CASH VIEW</span><b>13 <small>WEEKS</small></b></div>
        <div className="p-liquidity-bars">{[42, 56, 49, 66, 58, 73, 61, 79, 68, 84, 72, 91, 77].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
        <div className="p-model-axis"><span>W01</span><span>W07</span><span>W13</span></div>
      </div>
    );
  }
  return (
    <div className="p-discipline-visual p-discipline-report" aria-hidden="true">
      <div className="p-report-row p-report-head"><span>MANAGEMENT VIEW</span><span>PERIOD</span></div>
      <div className="p-report-row"><span>Revenue</span><i /><b>01</b></div>
      <div className="p-report-row"><span>Operating costs</span><i /><b>02</b></div>
      <div className="p-report-row p-report-emphasis"><span>Operating result</span><i /><b>03</b></div>
      <div className="p-report-row"><span>Cash position</span><i /><b>04</b></div>
    </div>
  );
}

function trackDisciplineLight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === "touch") return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
  event.currentTarget.style.setProperty("--card-x", `${x}%`);
  event.currentTarget.style.setProperty("--card-y", `${y}%`);
}

function resetDisciplineLight(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.removeProperty("--card-x");
  event.currentTarget.style.removeProperty("--card-y");
}

export default function CapabilityBento() {
  return (
    <section className="p-capabilities p-capabilities-editorial" id="capabilities" aria-labelledby="capabilities-title">
      <div className="p-cap-heading">
        <TechnicalLabel number="03">THE FINANCIAL SYSTEM</TechnicalLabel>
        <span>FOUR DISCIPLINES · EIGHT WORKING MODULES</span>
      </div>
      <div className="p-cap-intro p-cap-intro-editorial">
        <h2 id="capabilities-title">No más números<br />sin <em>contexto.</em></h2>
        <div>
          <p>Una lectura conectada del rendimiento, la planificación, la liquidez y los resultados. Cada disciplina reúne herramientas concretas, con su alcance claramente identificado.</p>
          <span className="p-cap-intro-index">A SYSTEM FOR BETTER FINANCIAL DECISIONS <b>→</b></span>
        </div>
      </div>
      <div className="p-disciplines">
        {disciplines.map((discipline) => (
          <article className={`p-discipline ${discipline.className}`} key={discipline.number} onPointerMove={trackDisciplineLight} onPointerLeave={resetDisciplineLight} onPointerCancel={resetDisciplineLight}>
            <div className="p-discipline-meta"><span>{discipline.number} / {discipline.code}</span><span>FINANCIAL ATLAS</span></div>
            <DisciplineVisual type={discipline.visual} />
            <div className="p-discipline-copy">
              <span className="p-discipline-index">{discipline.number}</span>
              <div>
                <h3>{discipline.title}</h3>
                <p>{discipline.description}</p>
                <ul className="p-discipline-modules">
                  {discipline.modules.map(([name, scope]) => <li key={name}><strong>{name}</strong><span>{scope}</span></li>)}
                </ul>
                <a href="#product">{discipline.number === "01" ? "Ver el modelo en el workspace" : discipline.number === "02" ? "Ver planificación en el workspace" : discipline.number === "03" ? "Ver tesorería en el workspace" : "Ver informes en el workspace"} <Arrow /></a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="p-disclaimer"><b>DATA NOTE</b> Los elementos gráficos son esquemáticos. La tesorería y los centros de coste requieren entradas manuales; los informes corresponden al alcance actual del MVP. No hay conexión bancaria activa.</p>
    </section>
  );
}
