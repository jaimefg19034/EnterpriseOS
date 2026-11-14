import Arrow from "../../components/ui/Arrow";
import DecisionField from "./DecisionField";
import type { Scenario } from "./scenarios";

export default function EditorialHero({ scenario }: { scenario: Scenario }) {
  return (
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
  );
}
