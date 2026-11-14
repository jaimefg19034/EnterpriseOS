import TechnicalLabel from "../../components/ui/TechnicalLabel";

export default function ProductAnatomy() {
  return (
    <section className="p-architecture">
        <div className="p-architecture-head"><TechnicalLabel number="06">FROM INPUT TO DECISION</SectionLabel><span>THE LOGIC OF THE SYSTEM</span></div>
        <div className="p-architecture-main"><h2>La diferencia no está<br />en tener más números.<br /><em>Está en entender</em><br />qué los mueve.</h2><div className="p-architecture-flow">{[[ "01", "INPUTS", "Drivers & assumptions" ],[ "02", "MODEL", "Financial logic" ],[ "03", "OUTLOOK", "Scenarios & cash" ],[ "04", "DECISION", "Management view" ]].map((row,i)=><div className="p-flow-node" key={row[0]}><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small>{i!==3&&<i>→</i>}</div>)}</div></div>
        <div className="p-comparison"><div><span>FRAGMENTED APPROACH</span><b>Hojas y modelos separados</b><p>Revisiones manuales y contexto repartido entre documentos.</p></div><div className="p-comparison-arrow">→</div><div><span>ENTERPRISEOS APPROACH</span><b>Una lectura financiera conectada</b><p>Un espacio para relacionar supuestos, resultados y previsiones.</p></div></div>
        <p className="p-scope-note">ALCANCE ACTUAL · EnterpriseOS es un MVP de planificación y análisis financiero con entradas manuales y persistencia local. No incluye todavía libro mayor, conexión bancaria automática ni presentación fiscal.</p>
      </section>
  );
}
