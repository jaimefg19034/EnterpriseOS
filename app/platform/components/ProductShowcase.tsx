import BrandMark from "../../components/ui/BrandMark";
import TechnicalLabel from "../../components/ui/TechnicalLabel";

export default function ProductShowcase() {
  return (
    <section className="p-product" id="product">
        <div className="p-product-heading"><TechnicalLabel number="04">INSIDE THE WORKSPACE</TechnicalLabel><span>ONE MODEL. DIFFERENT QUESTIONS.</span></div>
        <div className="p-product-intro"><h2>No te enseñamos<br />una lista de funciones.<br /><em>Te enseñamos</em><br />cómo se conectan.</h2><p>Desde las hipótesis que alimentan el modelo hasta la lectura de resultados y la previsión de caja.</p></div>
        <div className="p-product-stage">
          <div className="p-stage-sidebar"><div className="p-stage-brand"><BrandMark /><span>EnterpriseOS</span></div><small>FINANCE WORKSPACE</small><div className="p-stage-nav active"><i /> Overview</div><div className="p-stage-nav"><i /> Planning</div><div className="p-stage-nav"><i /> Statements</div><div className="p-stage-nav"><i /> Cash forecast</div><div className="p-stage-nav"><i /> Reports</div><div className="p-stage-sidebar-foot">LOCAL DEMO<br />SAMPLE DATA</div></div>
          <div className="p-stage-main"><div className="p-stage-top"><span>WORKSPACE / OVERVIEW</span><span>FY 2026 · EUR</span></div><div className="p-stage-title"><div><small>FINANCIAL PERFORMANCE</small><h3>Management overview</h3></div><span className="p-stage-status"><i /> MODEL READY</span></div><div className="p-stage-kpis"><div><small>REVENUE</small><b>248.000 €</b><span>Current model</span></div><div><small>EBITDA</small><b>51.000 €</b><span>Calculated output</span></div><div><small>NET INCOME</small><b>35.100 €</b><span>Illustrative model</span></div></div><div className="p-stage-lower"><div className="p-stage-chart"><div><small>REVENUE DEVELOPMENT</small><span>ILLUSTRATIVE TREND</span></div><svg viewBox="0 0 500 170" aria-hidden="true"><path className="p-stage-gridline" d="M0 35H500M0 80H500M0 125H500" /><path className="p-stage-area" d="M0 142 C45 128 60 112 95 120 S150 90 190 100 S245 65 285 79 S345 49 380 61 S450 24 500 28 V170 H0Z" /><path className="p-stage-line" d="M0 142 C45 128 60 112 95 120 S150 90 190 100 S245 65 285 79 S345 49 380 61 S450 24 500 28" /></svg><div className="p-stage-axis"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div></div><div className="p-stage-bridge"><small>PROFITABILITY BRIDGE</small><b>Where revenue goes</b><div><span>Revenue</span><strong>248.000 €</strong></div><div><span>Direct & operating costs</span><strong>−197.000 €</strong></div><div className="p-bridge-total"><span>EBITDA</span><strong>51.000 €</strong></div></div></div><div className="p-stage-foot"><span>MODEL / PLAN / REVIEW</span><span>DEMONSTRATION VIEW · NOT LIVE DATA</span></div></div>
        </div>
        <div className="p-product-caption"><span>FIG. 04 — MANAGEMENT WORKSPACE</span><span>VISUAL REPRESENTATION OF THE CURRENT MVP SCOPE</span></div>
      </section>
  );
}
