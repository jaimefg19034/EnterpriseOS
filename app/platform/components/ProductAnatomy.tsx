import TechnicalLabel from "../../components/ui/TechnicalLabel";

const stages = [
  { index: "01", name: "INPUTS", title: "Supuestos", detail: "Drivers & assumptions", note: "ENTRADA MANUAL", output: "Revenue · Costs · Timing" },
  { index: "02", name: "MODEL", title: "Modelo", detail: "Financial logic", note: "RELACIONES", output: "P&L · Budget · Variance" },
  { index: "03", name: "OUTLOOK", title: "Previsión", detail: "Scenarios & cash", note: "PROYECCIÓN", output: "Scenarios · 13-week cash" },
  { index: "04", name: "DECISION", title: "Decisión", detail: "Management view", note: "LECTURA", output: "Performance · Exposure" },
];

export default function ProductAnatomy() {
  return (
    <section className="p-architecture" aria-labelledby="p-architecture-title">
      <div className="p-architecture-head">
        <TechnicalLabel number="07">FROM INPUT TO DECISION</TechnicalLabel>
        <span>THE LOGIC OF THE SYSTEM</span>
      </div>
      <div className="p-architecture-main">
        <h2 id="p-architecture-title">La diferencia no está<br />en tener más números.<br /><em>Está en entender</em><br />qué los mueve.</h2>
        <div className="p-architecture-instrument">
          <div className="p-architecture-instrument-head">
            <span>MODEL ARCHITECTURE</span>
            <span>01 — 04 / FLOW</span>
          </div>
          <ol className="p-architecture-flow">
            {stages.map((stage, i) => (
              <li className="p-flow-node" key={stage.index}>
                <div className="p-flow-node-top"><span>{stage.index}</span><small>{stage.note}</small></div>
                <b>{stage.name}</b>
                <strong>{stage.title}</strong>
                <small className="p-flow-description">{stage.detail}</small>
                <span className="p-flow-output">{stage.output}</span>
                {i !== stages.length - 1 && <span className="p-flow-connector" aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
          <div className="p-architecture-instrument-foot">
            <span>INPUT → TRANSFORM → PROJECT → INTERPRET</span>
            <span>ILLUSTRATIVE SYSTEM MAP</span>
          </div>
        </div>
      </div>
      <div className="p-comparison">
        <div><span>FRAGMENTED APPROACH</span><b>Hojas y modelos separados</b><p>Revisiones manuales y contexto repartido entre documentos.</p></div>
        <div className="p-comparison-arrow" aria-hidden="true">→</div>
        <div><span>ENTERPRISEOS APPROACH</span><b>Una lectura financiera conectada</b><p>Un espacio para relacionar supuestos, resultados y previsiones.</p></div>
      </div>
      <p className="p-scope-note">ALCANCE ACTUAL · EnterpriseOS es un MVP de planificación y análisis financiero con entradas manuales y persistencia local. No incluye todavía libro mayor, conexión bancaria automática ni presentación fiscal.</p>
    </section>
  );
}
