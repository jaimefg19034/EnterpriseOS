"use client";

const benefits = [
  { number: "01", title: "Entiende el rendimiento", copy: "Lee ingresos, costes y márgenes desde una única perspectiva.", icon: "performance" },
  { number: "02", title: "Anticipa escenarios", copy: "Compara hipótesis y entiende cómo afectan al resultado.", icon: "scenarios" },
  { number: "03", title: "Vigila la caja", copy: "Proyecta tesorería a 13 semanas con tus propios datos.", icon: "cash" },
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
  return <main className="eos-home" id="top">
    <header className="eos-home-nav">
      <Brand />
      <nav aria-label="Navegación principal"><a href="#what">Qué hacemos</a><a href="#pricing">Precios</a></nav>
      <div className="eos-home-nav-actions">
        <a className="eos-home-login" href="/EnterpriseOS/account/">Iniciar sesión</a>
        <a className="eos-home-button eos-home-button-small" href="/EnterpriseOS/account/">Empezar ahora <Arrow /></a>
      </div>
    </header>

    <section className="eos-home-hero">
      <div className="eos-home-hero-copy">
        <div className="eos-home-kicker"><i /> FINANCIAL DECISION INTELLIGENCE</div>
        <h1>La claridad financiera<br />para <em>decidir mejor.</em></h1>
        <p>Conecta rendimiento, planificación y tesorería. Comprende qué ocurre en tu negocio y anticipa lo que viene.</p>
        <div className="eos-home-hero-actions">
          <a className="eos-home-button" href="/EnterpriseOS/account/">Crear cuenta / Empezar <Arrow /></a>
          <a className="eos-home-text-link" href="/EnterpriseOS/account/">Iniciar sesión <span>↗</span></a>
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
      <div className="eos-home-close-bottom"><p>Entra en EnterpriseOS y lleva tu planificación financiera a un lugar más claro.</p><a className="eos-home-button" href="/EnterpriseOS/account/">Empezar ahora <Arrow /></a></div>
    </section>

    <footer className="eos-home-footer">
      <div className="eos-home-footer-main"><Brand /><p>Financial Decision Intelligence<br />para empresas que quieren decidir con contexto.</p></div>
      <div className="eos-home-footer-links"><a href="#what">Qué hacemos</a><a href="#pricing">Precios</a><a href="/EnterpriseOS/account/">Iniciar sesión</a><a href="/EnterpriseOS/account/">Empezar ahora</a></div>
      <div className="eos-home-footer-bottom"><span>© {new Date().getFullYear()} ENTERPRISEOS</span><span>DATOS MANUALES · PERSISTENCIA LOCAL · MVP</span><span>THE FINANCIAL ATLAS</span></div>
    </footer>
  </main>;
}
