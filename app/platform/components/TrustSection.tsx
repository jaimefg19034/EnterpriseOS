import TechnicalLabel from "../../components/ui/TechnicalLabel";

export default function TrustSection() {
  return (
    <section className="p-proof">
        <div className="p-proof-heading"><TechnicalLabel number="02">A CLEARER STANDARD</SectionLabel><span>NO FICTION. JUST THE PRODUCT.</span></div>
        <div className="p-proof-grid">
          <div className="p-proof-intro"><h2>La confianza<br />empieza por<br /><em>la transparencia.</em></h2><p>Una herramienta financiera debe dejar claro qué sabe, qué estima y qué necesita que introduzcas.</p></div>
          <div className="p-proof-item"><span>01 / MODEL</span><b>Supuestos visibles</b><p>Las entradas del modelo y los resultados calculados se distinguen de forma explícita.</p><i>INPUTS → OUTPUTS</i></div>
          <div className="p-proof-item"><span>02 / FORECAST</span><b>Previsiones identificadas</b><p>Los escenarios y la tesorería proyectada se presentan como estimaciones, no como movimientos bancarios reales.</p><i>PLAN → OUTLOOK</i></div>
          <div className="p-proof-item"><span>03 / SCOPE</span><b>Alcance honesto</b><p>EnterpriseOS es actualmente un MVP de planificación y análisis, no un ERP ni una contabilidad conectada.</p><i>CLARITY → TRUST</i></div>
        </div>
      </section>
  );
}
