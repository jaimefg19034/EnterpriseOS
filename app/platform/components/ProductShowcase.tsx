import TechnicalLabel from "../../components/ui/TechnicalLabel";
import { PlanningWorkspace } from "@/components/planning-workspace";

export default function ProductShowcase() {
  return (
    <section className="p-product" id="product">
        <div className="p-product-heading"><TechnicalLabel number="04">INSIDE THE WORKSPACE</TechnicalLabel><span>ONE MODEL. DIFFERENT QUESTIONS.</span></div>
        <div className="p-product-intro"><h2>No te enseñamos<br />una lista de funciones.<br /><em>Te enseñamos</em><br />cómo se conectan.</h2><p>Desde las hipótesis que alimentan el modelo hasta la lectura de resultados y la previsión de caja.</p></div>
        <div className="p-product-stage p-product-live">
          <div className="p-live-product-bar"><span>LIVE PRODUCT COMPONENT / PLANNING WORKSPACE</span><span>DEMO DATA · TEMPORARY SESSION</span></div>
          <PlanningWorkspace language="es" previewMode />
        </div>
        <div className="p-product-caption"><span>FIG. 04 — MANAGEMENT WORKSPACE</span><span>VISUAL REPRESENTATION OF THE CURRENT MVP SCOPE</span></div>
      </section>
  );
}
