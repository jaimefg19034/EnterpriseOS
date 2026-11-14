import TechnicalLabel from "../../components/ui/TechnicalLabel";
import { PlanningWorkspace } from "@/components/planning-workspace";

export default function ProductShowcase() {
  return (
    <section className="p-product" id="product" aria-labelledby="product-showcase-title" aria-describedby="product-demo-note">
      <div className="p-product-heading">
        <TechnicalLabel number="04">INSIDE THE WORKSPACE</TechnicalLabel>
        <span>ONE MODEL. DIFFERENT QUESTIONS.</span>
      </div>

      <div className="p-product-intro">
        <h2 id="product-showcase-title">No te enseñamos<br />una lista de funciones.<br /><em>Te enseñamos</em><br />cómo se conectan.</h2>
        <p>Desde las hipótesis que alimentan el modelo hasta la lectura de resultados y la previsión de caja.</p>
      </div>

      <div className="p-product-demo-note">
        <span>DEMO ENVIRONMENT · SAMPLE DATA</span>
        <p id="product-demo-note">Esta vista utiliza un plan de ejemplo. Puedes modificar sus hipótesis y explorar el modelo; los cambios son temporales, no se guardan y no afectan a tus datos del workspace.</p>
      </div>

      <div className="p-product-frame">
        <div className="p-product-frame-head">
          <div className="p-frame-identity">
            <span className="p-frame-index">04 / A</span>
            <span><b>ENTERPRISEOS</b><small>FINANCIAL PLANNING SYSTEM</small></span>
          </div>
          <div className="p-frame-status"><i /> INTERACTIVE PREVIEW <span>·</span> SAMPLE DATA</div>
        </div>
        <div className="p-product-stage p-product-live">
          <div className="p-live-product-bar">
            <span>MODULE 01 — PLANNING WORKSPACE</span>
            <span>MODEL INPUTS / OUTPUTS / SCENARIOS</span>
          </div>
          <PlanningWorkspace language="es" previewMode />
        </div>
        <div className="p-product-frame-foot">
          <span>INTERACTIVE COMPONENT · NOT A STATIC MOCKUP</span>
          <span>SESSION-ONLY CHANGES <b>↗</b></span>
        </div>
      </div>
      <div className="p-product-caption"><span>FIG. 04 — MANAGEMENT WORKSPACE</span><span>REAL PRODUCT COMPONENT · TEMPORARY DEMO DATA</span></div>
    </section>
  );
}
