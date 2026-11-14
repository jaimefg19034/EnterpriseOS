import Arrow from "../../components/ui/Arrow";

export default function ConversionSection() {
  return (
    <section className="p-cta">
        <div className="p-cta-meta"><span>ENTERPRISEOS / NEXT STEP</span><span>07 — 07</span></div>
        <div className="p-cta-main"><h2>La próxima decisión<br />merece una <em>mejor perspectiva.</em></h2><p>Explora un espacio de trabajo diseñado para modelar, planificar y entender mejor las finanzas de tu empresa.</p><a className="p-button p-button-light" href="/EnterpriseOS/">Entrar en EnterpriseOS <Arrow /></a></div>
        <div className="p-cta-seal"><b>EOS</b><span>PLAN<br />MODEL<br />DECIDE</span></div>
        <svg className="p-cta-contours" viewBox="0 0 500 360" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M-20 260 C80 60 200 30 290 140 S420 280 520 80" /><path d="M-20 280 C80 80 200 50 290 160 S420 300 520 100" /><path d="M-20 300 C80 100 200 70 290 180 S420 320 520 120" /><path d="M-20 320 C80 120 200 90 290 200 S420 340 520 140" /><path d="M-20 340 C80 140 200 110 290 220 S420 360 520 160" /></g></svg>
      </section>
  );
}
