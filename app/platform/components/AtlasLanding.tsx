"use client";

import { useState } from "react";

const benefits = [
  { number: "01", title: "Entiende el rendimiento", copy: "Lee ingresos, costes y márgenes desde una única perspectiva.", icon: "performance" },
  { number: "02", title: "Anticipa escenarios", copy: "Compara hipótesis y entiende cómo afectan al resultado.", icon: "scenarios" },
  { number: "03", title: "Conecta los estados financieros", copy: "Relaciona resultado, balance y flujo de caja con supuestos editables.", icon: "cash" },
  { number: "04", title: "Decide con contexto", copy: "Conecta planificación, operaciones y reporting de gestión.", icon: "decision" },
] as const;

function Brand() {
  return <a className="eos-home-brand" href="#top" aria-label="EnterpriseOS, inicio">
    <span className="eos-home-mark">E<span>O</span></span>
    <span className="eos-home-brand-name">ENTERPRISE<span>OS</span><small>FINANCIAL DECISION INTELLIGENCE</small></span>
  </a>;
}

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h13M10 4l6 6-6 6" /></svg>;
}

function HeroVisual() {
  return <div className="eos-home-visual" aria-hidden="true">
    <div className="eos-home-visual-grid" />
    <svg className="eos-home-orbit-svg" viewBox="0 0 620 500" fill="none">
      <defs>
        <linearGradient id="eos-line" x1="70" y1="50" x2="540" y2="450" gradientUnits="userSpaceOnUse"><stop stopColor="#E4FF75"/><stop offset="1" stopColor="#67D9D1"/></linearGradient>
        <radialGradient id="eos-core"><stop stopColor="#DFFF83" stopOpacity=".38"/><stop offset="1" stopColor="#8BD8D1" stopOpacity="0"/></radialGradient>
      </defs>
      <circle cx="310" cy="250" r="176" stroke="url(#eos-line)" strokeOpacity=".26"/>
      <ellipse cx="310" cy="250" rx="235" ry="92" stroke="#9DE7DC" strokeOpacity=".35" transform="rotate(-28 310 250)"/>
      <ellipse cx="310" cy="250" rx="230" ry="105" stroke="#DFFF83" strokeOpacity=".45" transform="rotate(42 310 250)"/>
      <circle cx="310" cy="250" r="126" fill="url(#eos-core)"/>
      <path d="M118 332C173 223 236 170 310 170s137 53 192 162" stroke="url(#eos-line)" strokeWidth="1.5"/>
      <path d="M128 178c75 118 145 177 210 177s135-59 210-177" stroke="#DFFF83" strokeOpacity=".5"/>
      <circle cx="310" cy="250" r="64" stroke="#DFFF83" strokeOpacity=".7"/>
      <path d="M282 250h56M310 222v56" stroke="#E9F2E5" strokeOpacity=".65"/>
      <circle cx="102" cy="303" r="5" fill="#DFFF83"/><circle cx="511" cy="167" r="5" fill="#8BD8D1"/><circle cx="400" cy="402" r="4" fill="#DFFF83"/>
    </svg>
    <div className="eos-home-core"><span>EOS</span><small>MODEL / DECIDE</small></div>
    <div className="eos-home-data eos-home-data-a"><small>FINANCIAL VIEW</small><strong>360°</strong><i><b /></i></div>
    <div className="eos-home-data eos-home-data-b"><small>SCENARIO ENGINE</small><strong>LIVE MODEL</strong><i><b /></i></div>
    <div className="eos-home-visual-caption">PLAN <i /> MODEL <i /> ANTICIPATE <i /> DECIDE</div>
  </div>;
}

function BenefitIcon({ type }: { type: string }) {
  if (type === "performance") return <svg viewBox="0 0 40 40"><path d="M5 32V8M5 32h30M11 26l7-8 6 4 10-13"/><path d="M27 9h7v7"/></svg>;
  if (type === "scenarios") return <svg viewBox="0 0 40 40"><path d="M5 31c7-1 8-19 15-19s8 16 15 17M5 31c7-1 10-9 15-9s8 7 15 7"/><circle cx="20" cy="12" r="2"/></svg>;
  if (type === "cash") return <svg viewBox="0 0 40 40"><rect x="5" y="9" width="30" height="22" rx="3"/><path d="M5 16h30M12 25h7M27 22v6"/></svg>;
  return <svg viewBox="0 0 40 40"><path d="M7 20h8l5-10 6 20 5-10h3"/><circle cx="20" cy="20" r="16"/></svg>;
}

export default function AtlasLanding() {
  const [demoAccessOpen, setDemoAccessOpen] = useState(false);
  const [demoCode, setDemoCode] = useState("");
  const [demoError, setDemoError] = useState("");

  function openDemoAccess(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setDemoCode("");
    setDemoError("");
    setDemoAccessOpen(true);
  }

  function submitDemoAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoCode.trim().toUpperCase() !== "ATLAS-DEMO-2026") {
      setDemoError("La clave no es correcta. Comprueba el código e inténtalo de nuevo.");
      return;
    }
    window.sessionStorage.setItem("enterpriseos:demo-access", "granted");
    window.location.href = "/EnterpriseOS/";
  }

  return <main className="eos-home" id="top">
    <header className="eos-home-nav">
      <Brand />
      <nav aria-label="Navegación principal"><a href="#what">Qué hacemos</a><a href="#pricing">Precios</a></nav>
      <div className="eos-home-nav-actions">
        <a className="eos-home-login" href="/EnterpriseOS/account/">Iniciar sesión</a>
        <a className="eos-home-workspace-link" href="/EnterpriseOS/" onClick={openDemoAccess}>Entrar al workspace <Arrow /></a>
        <a className="eos-home-button eos-home-button-small" href="/EnterpriseOS/account/?mode=signup">Crear cuenta <Arrow /></a>
      </div>
    </header>

    <section className="eos-home-hero">
      <div className="eos-home-hero-copy">
        <div className="eos-home-kicker"><i /> FINANCIAL DECISION INTELLIGENCE</div>
        <h1>La claridad financiera<br />para <em>decidir mejor.</em></h1>
        <p>Conecta rendimiento, planificación y tesorería. Comprende qué ocurre en tu negocio y anticipa lo que viene.</p>
        <div className="eos-home-hero-actions">
          <a className="eos-home-button" href="/EnterpriseOS/" onClick={openDemoAccess}>Probar demo <Arrow /></a>
          <a className="eos-home-text-link" href="/EnterpriseOS/account/">Ya tengo cuenta · Iniciar sesión <span>↗</span></a>
        </div>
        <div className="eos-home-proof"><span><i /> UNA VISIÓN FINANCIERA CONECTADA</span><span>DISEÑADO PARA DECISORES</span></div>
      </div>
      <HeroVisual />
      <div className="eos-home-hero-index">01 <span /> FINANCIAL ATLAS</div>
    </section>

    <section className="eos-home-what" id="what">
      <div className="eos-home-section-top"><span>QUÉ HACEMOS</span><span>UNA PLATAFORMA. CUATRO RESULTADOS.</span></div>
      <div className="eos-home-what-heading"><h2>Menos ruido.<br /><em>Más perspectiva.</em></h2><p>Todo lo esencial para entender la salud financiera de tu empresa, sin convertir tu día a día en otro laberinto de hojas de cálculo.</p></div>
      <div className="eos-home-benefits">{benefits.map((item) => <article className="eos-home-benefit" key={item.number}>
        <div className="eos-home-benefit-top"><span>{item.number}</span><BenefitIcon type={item.icon}/></div>
        <h3>{item.title}</h3><p>{item.copy}</p><div className="eos-home-benefit-line" />
      </article>)}</div>
    </section>


    <section className="eos-home-product" id="product">
      <div className="eos-home-section-top"><span>QUÉ PUEDES HACER</span><span>DEL DATO A LA DECISIÓN</span></div>
      <div className="eos-home-product-heading">
        <div><div className="eos-home-kicker"><i /> EL WORKSPACE POR DENTRO</div><h2>Tu negocio, explicado<br /><em>en números claros.</em></h2></div>
        <p>EnterpriseOS reúne herramientas de análisis y planificación para que puedas entender el presente, probar decisiones y ver sus posibles consecuencias.</p>
      </div>
      <div className="eos-home-product-grid">
        <article className="eos-home-product-card eos-home-product-card-wide">
          <div className="eos-home-product-visual eos-home-visual-dashboard">
            <div className="eos-home-mini-top"><span>EXECUTIVE OVERVIEW</span><i>FY 2026 · DEMO</i></div>
            <div className="eos-home-mini-kpis"><div><small>REVENUE</small><b>€248k</b><i>↗ 8.4%</i></div><div><small>EBITDA</small><b>€51k</b><i>↗ 6.2%</i></div><div><small>CASH</small><b>€112k</b><i>↗ 4.1%</i></div></div>
            <div className="eos-home-mini-chart"><span style={{height:"34%"}}/><span style={{height:"45%"}}/><span style={{height:"42%"}}/><span style={{height:"57%"}}/><span style={{height:"64%"}}/><span style={{height:"78%"}}/><span style={{height:"88%"}}/></div>
          </div>
          <div className="eos-home-product-copy"><span>01 / VISIÓN EJECUTIVA</span><h3>Entiende cómo va tu empresa.</h3><p>Visualiza ingresos, costes, márgenes y resultados en un dashboard pensado para detectar lo importante de un vistazo.</p></div>
        </article>
        <article className="eos-home-product-card">
          <div className="eos-home-product-visual eos-home-visual-scenarios">
            <div className="eos-home-scenario-lines"><span>BASE <b>€248k</b><i style={{width:"72%"}}/></span><span>GROWTH <b>€286k</b><i style={{width:"91%"}}/></span><span>CONSERVATIVE <b>€218k</b><i style={{width:"58%"}}/></span></div>
            <div className="eos-home-scenario-note">3 ESCENARIOS COMPARABLES</div>
          </div>
          <div className="eos-home-product-copy"><span>02 / PLANIFICACIÓN</span><h3>Prueba antes de decidir.</h3><p>Modifica presupuestos y supuestos para comparar escenarios y medir su impacto en ingresos y rentabilidad.</p></div>
        </article>
        <article className="eos-home-product-card">
          <div className="eos-home-product-visual eos-home-visual-cash">
            <div className="eos-home-cash-head"><span>13-WEEK CASH VIEW</span><b>€112,400</b></div>
            <div className="eos-home-cash-bars">{[68,54,78,48,85,63,92,72,58,88,67,96,78].map((h,i)=><i key={i} style={{height:h+"%"}} />)}</div>
            <div className="eos-home-cash-legend"><span>ENTRADAS</span><span>SALIDAS</span></div>
          </div>
          <div className="eos-home-product-copy"><span>03 / TESORERÍA</span><h3>Anticipa tus necesidades de caja.</h3><p>Prepara una previsión manual de 13 semanas y sigue cobros, pagos y vencimientos pendientes.</p></div>
        </article>
        <article className="eos-home-product-card">
          <div className="eos-home-product-visual eos-home-visual-statements">
            <div className="eos-home-statement-row"><span>Income statement</span><b>EBITDA</b><i>€51.0k</i></div>
            <div className="eos-home-statement-row"><span>Balance sheet</span><b>ASSETS</b><i>€184.2k</i></div>
            <div className="eos-home-statement-row"><span>Cash flow</span><b>NET CASH</b><i>+€18.6k</i></div>
            <div className="eos-home-statement-link">RESULTADO ↔ BALANCE ↔ CAJA</div>
          </div>
          <div className="eos-home-product-copy"><span>04 / MODELO FINANCIERO</span><h3>Conecta los tres estados.</h3><p>Relaciona cuenta de resultados, balance y flujo de caja mediante supuestos editables en un modelo simplificado.</p></div>
        </article>
        <article className="eos-home-product-card">
          <div className="eos-home-product-visual eos-home-visual-operations">
            <div className="eos-home-ops-center">COSTES<br/><b>POR ÁREA</b></div>
            <div className="eos-home-ops-node node-a">SALES</div><div className="eos-home-ops-node node-b">OPS</div><div className="eos-home-ops-node node-c">ADMIN</div>
            <div className="eos-home-ops-ring"/>
          </div>
          <div className="eos-home-product-copy"><span>05 / OPERACIONES</span><h3>Localiza dónde se consume el margen.</h3><p>Registra y analiza costes por centro o área para añadir contexto operativo a la lectura financiera.</p></div>
        </article>
        <article className="eos-home-product-card">
          <div className="eos-home-product-visual eos-home-visual-reports">
            <div className="eos-home-report-sheet"><div/><div/><div/><div/><div/></div>
            <div className="eos-home-report-export"><b> XLSX </b><span>MANAGEMENT REPORT</span><i>READY TO EXPORT ↗</i></div>
          </div>
          <div className="eos-home-product-copy"><span>06 / INFORMES</span><h3>Convierte el análisis en acción.</h3><p>Consulta informes de gestión y exporta resultados para compartirlos o seguir trabajando con ellos.</p></div>
        </article>
      </div>
      <div className="eos-home-product-foot"><span>UN FLUJO DE TRABAJO SENCILLO</span><div><b>01</b> Entender <i>→</i> <b>02</b> Planificar <i>→</i> <b>03</b> Anticipar <i>→</i> <b>04</b> Decidir</div></div>
      <div className="eos-home-product-cta"><p>¿Quieres verlo funcionando? Entra y explora el entorno de demostración.</p><a className="eos-home-button" href="/EnterpriseOS/" onClick={openDemoAccess}>Abrir workspace demo <Arrow /></a></div>
      <p className="eos-home-product-disclaimer">VISTA ILUSTRATIVA · CIFRAS SINTÉTICAS · DATOS Y SUPUESTOS INTRODUCIDOS MANUALMENTE · LOS CAMBIOS SE GUARDAN LOCALMENTE EN ESTA VERSIÓN.</p>
    </section>

    <section className="eos-home-pricing" id="pricing">
      <div className="eos-home-section-top"><span>PRECIOS</span><span>ACCESO AL FINANCIAL ATLAS</span></div>
      <div className="eos-home-pricing-intro">
        <div><div className="eos-home-kicker"><i /> PLANES MENSUALES</div><h2>Elige el nivel de<br /><em>claridad que necesitas.</em></h2></div>
        <p>Empieza con el control financiero esencial y amplía tus capacidades cuando tu empresa lo necesite. Todos los precios son mensuales, sin IVA.</p>
      </div>
      <div className="eos-home-pricing-grid">
        <article className="eos-home-tier-card">
          <div className="eos-home-tier-top"><span>01 / ESSENTIAL</span><span>START</span></div>
          <h3>Essential</h3><p>Control financiero esencial para empresas pequeñas.</p>
          <div className="eos-home-tier-price"><strong>29 €</strong><span>/ mes</span></div>
          <ul><li>Dashboard ejecutivo</li><li>Cuenta de resultados (P&amp;L)</li><li>Indicadores financieros básicos</li></ul>
          <a className="eos-home-tier-link" href="/EnterpriseOS/account/?mode=signup&plan=essential">Elegir Essential <Arrow /></a>
        </article>
        <article className="eos-home-tier-card is-recommended">
          <div className="eos-home-tier-top"><span>02 / PROFESSIONAL</span><span className="eos-home-recommended">RECOMENDADO</span></div>
          <h3>Professional</h3><p>Planificación y modelización para anticipar decisiones.</p>
          <div className="eos-home-tier-price"><strong>79 €</strong><span>/ mes</span></div>
          <ul><li>Todo lo incluido en Essential</li><li>Presupuestos y escenarios</li><li>Modelo financiero de tres estados</li><li>Informes y exportaciones</li></ul>
          <a className="eos-home-button eos-home-tier-cta" href="/EnterpriseOS/account/?mode=signup&plan=professional">Elegir Professional <Arrow /></a>
        </article>
        <article className="eos-home-tier-card">
          <div className="eos-home-tier-top"><span>03 / BUSINESS</span><span>ADVANCED</span></div>
          <h3>Business</h3><p>Visión financiera y operativa ampliada.</p>
          <div className="eos-home-tier-price"><strong>149 €</strong><span>/ mes</span></div>
          <ul><li>Todo lo incluido en Professional</li><li>Operaciones y centros de coste</li><li>Análisis operativo ampliado</li><li>Acceso a todas las áreas actuales</li></ul>
          <a className="eos-home-tier-link" href="/EnterpriseOS/account/?mode=signup&plan=business">Elegir Business <Arrow /></a>
        </article>
      </div>
      <p className="eos-home-pricing-disclaimer">PRECIOS PROPUESTOS · SIN IVA · CONTRATACIÓN ONLINE PENDIENTE DE ACTIVAR SUPABASE Y STRIPE. LOS DATOS DE ESTA VERSIÓN SIGUEN EN ALMACENAMIENTO LOCAL.</p>
    </section>

    <section className="eos-home-close">
      <div className="eos-home-close-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="eos-home-kicker"><i /> EL SIGUIENTE PASO</div>
      <h2>Entiende los números.<br /><em>Adelántate a las decisiones.</em></h2>
      <div className="eos-home-close-bottom"><p>Entra en EnterpriseOS y lleva tu planificación financiera a un lugar más claro.</p><a className="eos-home-button" href="/EnterpriseOS/" onClick={openDemoAccess}>Probar demo <Arrow /></a></div>
    </section>

    <footer className="eos-home-footer">
      <div className="eos-home-footer-main"><Brand /><p>Financial Decision Intelligence<br />para empresas que quieren decidir con contexto.</p></div>
      <div className="eos-home-footer-links"><a href="#what">Qué hacemos</a><a href="#pricing">Precios</a><a href="/EnterpriseOS/account/">Iniciar sesión</a><a href="/EnterpriseOS/" onClick={openDemoAccess}>Workspace demo</a></div>
      <div className="eos-home-footer-bottom"><span>© {new Date().getFullYear()} ENTERPRISEOS</span><span>DATOS MANUALES · PERSISTENCIA LOCAL · MVP</span><span>THE FINANCIAL ATLAS</span></div>
    </footer>
    {demoAccessOpen && <div className="eos-home-demo-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDemoAccessOpen(false); }}>
      <section className="eos-home-demo-dialog" role="dialog" aria-modal="true" aria-labelledby="eos-home-demo-title">
        <button className="eos-home-demo-close" type="button" onClick={() => setDemoAccessOpen(false)} aria-label="Cerrar">×</button>
        <span className="eos-home-demo-kicker">ENTERPRISEOS / DEMO ACCESS</span>
        <div className="eos-home-demo-mark">EO</div>
        <h2 id="eos-home-demo-title">Explora el workspace.</h2>
        <p>Introduce la clave de demostración para acceder al entorno financiero interactivo con datos ficticios.</p>
        <form onSubmit={submitDemoAccess}>
          <label htmlFor="eos-home-demo-code">Clave de acceso</label>
          <input id="eos-home-demo-code" type="password" autoComplete="off" value={demoCode} onChange={(event) => { setDemoCode(event.target.value); setDemoError(""); }} placeholder="Introduce tu clave" required autoFocus />
          {demoError && <span className="eos-home-demo-error" role="alert">{demoError}</span>}
          <button type="submit">Acceder al workspace <Arrow /></button>
        </form>
        <div className="eos-home-demo-foot">DEMO CON DATOS SINTÉTICOS <i /> SIN CONEXIÓN BANCARIA</div>
        <a href="/EnterpriseOS/account/">¿Ya tienes una cuenta? Iniciar sesión</a>
      </section>
    </div>}
  </main>;
}
