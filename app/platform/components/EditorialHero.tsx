import Arrow from "../../components/ui/Arrow";
import TopographicField from "./TopographicField";
import type { Scenario } from "./scenarios";

export default function EditorialHero({ scenario }: { scenario: Scenario }) {
  return (
    <section className="p-hero" aria-labelledby="platform-hero-title">
      <div className="p-hero-index">
        <span>ENTERPRISEOS <i aria-hidden="true">/</i> FINANCIAL DECISION INTELLIGENCE</span>
        <span>FINANCIAL DECISION INTELLIGENCE <b>FIELD / 01</b></span>
      </div>

      <div className="p-hero-copy">
        <div className="p-kicker"><i /> FINANZAS · PLANIFICACIÓN · DIRECCIÓN</div>
        <h1 id="platform-hero-title">El futuro<br />no se <em>adivina.</em><br /><span>Se modela.</span></h1>
        <p>Entiende qué mueve tus resultados, contrasta lo que puede venir y decide con una perspectiva financiera conectada.</p>
        <div className="p-actions">
          <a className="p-button" href="/EnterpriseOS/">Explorar EnterpriseOS <Arrow /></a>
          <a className="p-link" href="#product">Conocer el workspace <span>↓</span></a>
        </div>
        <div className="p-hero-foot">
          <b>00 / 07</b>
          <span>MODELAR LO QUE IMPORTA.<br />ANTICIPAR LO QUE CAMBIA.</span>
        </div>
      </div>

      <div className="p-hero-visual-column">
        <div className="p-hero-visual-note"><span>FIG. 001</span><b>Una lectura. Múltiples futuros.</b></div>
        <TopographicField scenario={scenario} />
        <div className="p-hero-visual-caption"><span>01 — SCENARIO TOPOGRAPHY</span><span>BASE / DOWNSIDE / UPSIDE</span></div>
      </div>

      <div className="p-hero-baseline">
        <span>PLAN <i>→</i> MODEL <i>→</i> ANTICIPATE <i>→</i> DECIDE</span>
        <span>THE FINANCIAL ATLAS <b>·</b> A CLEARER VIEW OF YOUR BUSINESS</span>
      </div>
    </section>
  );
}
