"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

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

function subscribeToPlanHash(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getPlanHashSnapshot() {
  const match = window.location.hash.match(/^#plan-(essential|professional|business)$/);
  return match?.[1] ?? "";
}

function getServerPlanHashSnapshot() {
  return "";
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
      <circle cx="310" cy="250" r="202" stroke="#BDECE1" strokeOpacity=".13" strokeDasharray="1 9"/>
      <circle cx="310" cy="250" r="150" stroke="#DFFF83" strokeOpacity=".18" strokeDasharray="38 18"/>
      <path className="eos-home-orbit-sweep" d="M310 48a202 202 0 0 1 174 99" stroke="url(#eos-line)" strokeWidth="2.4" strokeLinecap="round"/>
      <path d="M82 250h456M310 22v456" stroke="#BDECE1" strokeOpacity=".075" strokeDasharray="2 9"/>
      <path d="M180 112l22 22m236 232 22 22M440 112l-22 22M180 388l22-22" stroke="#DFFF83" strokeOpacity=".28"/>
      <circle cx="310" cy="250" r="88" stroke="#BDECE1" strokeOpacity=".17" strokeDasharray="2 6"/>
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
  const [activeNav, setActiveNav] = useState("what");
  const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLElement | null>(null);
  const highlightedPlan = useSyncExternalStore(subscribeToPlanHash, getPlanHashSnapshot, getServerPlanHashSnapshot);

  function trackSurfacePointer(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  }

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let frame = 0;
    const updateIndicator = (section?: string) => {
      const target = section || activeNav;
      const link = nav.querySelector<HTMLAnchorElement>(`a[href="#${target}"]`);
      if (link) setNavIndicator((current) => current.left === link.offsetLeft && current.width === link.offsetWidth ? current : { left: link.offsetLeft, width: link.offsetWidth });
    };
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveNav(visible.target.id);
    }, { rootMargin: "-24% 0px -58% 0px", threshold: [0, .15, .35, .6] });
    ["what", "how-it-works", "pricing", "faq"].forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => updateIndicator());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateIndicator();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [activeNav]);

  function scrollToAnchor(event: React.MouseEvent<HTMLAnchorElement>) {
    const href = event.currentTarget.getAttribute("href");
    if (!href?.startsWith("#")) return;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const contentTarget = id === "what"
      ? target.querySelector<HTMLElement>(".eos-home-what-heading")
      : id === "how-it-works"
        ? target.querySelector<HTMLElement>(".eos-home-product-heading")
        : id === "faq"
          ? target.querySelector<HTMLElement>(".eos-home-faq-heading")
          : target;
    const navHeight = (navRef.current?.closest(".eos-home-nav") as HTMLElement | null)?.getBoundingClientRect().height ?? 0;
    const top = Math.max(0, window.scrollY + (contentTarget ?? target).getBoundingClientRect().top - navHeight - 20);
    window.history.pushState(null, "", href);
    window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

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
    window.location.assign("/EnterpriseOS/");
  }

  return <main className="eos-home" id="top">
    <header className="eos-home-nav">
      <Brand />
      <nav ref={navRef} aria-label="Navegación principal" onMouseLeave={() => { const nav = navRef.current; const link = nav?.querySelector<HTMLAnchorElement>(`a[href="#${activeNav}"]`); if (link) setNavIndicator((current) => current.left === link.offsetLeft && current.width === link.offsetWidth ? current : { left: link.offsetLeft, width: link.offsetWidth }); }}><span className="eos-home-nav-indicator" aria-hidden="true" style={{ transform: `translate3d(${navIndicator.left}px,0,0)`, width: navIndicator.width }} /><a className={activeNav === "what" ? "is-active" : ""} href="#what" onClick={scrollToAnchor} onMouseEnter={() => { setActiveNav("what"); const link = navRef.current?.querySelector<HTMLAnchorElement>('a[href="#what"]'); if (link) setNavIndicator({ left: link.offsetLeft, width: link.offsetWidth }); }}>Qué hacemos</a><a className={activeNav === "how-it-works" ? "is-active" : ""} href="#how-it-works" onClick={scrollToAnchor} onMouseEnter={() => { setActiveNav("how-it-works"); const link = navRef.current?.querySelector<HTMLAnchorElement>('a[href="#how-it-works"]'); if (link) setNavIndicator({ left: link.offsetLeft, width: link.offsetWidth }); }}>Cómo funciona</a><a className={activeNav === "pricing" ? "is-active" : ""} href="#pricing" onClick={scrollToAnchor} onMouseEnter={() => { setActiveNav("pricing"); const link = navRef.current?.querySelector<HTMLAnchorElement>('a[href="#pricing"]'); if (link) setNavIndicator({ left: link.offsetLeft, width: link.offsetWidth }); }}>Precios</a><a className={activeNav === "faq" ? "is-active" : ""} href="#faq" onClick={scrollToAnchor} onMouseEnter={() => { setActiveNav("faq"); const link = navRef.current?.querySelector<HTMLAnchorElement>('a[href="#faq"]'); if (link) setNavIndicator({ left: link.offsetLeft, width: link.offsetWidth }); }}>Preguntas frecuentes</a><details className="eos-home-plan-menu"><summary>Ver paquetes <span aria-hidden="true">⌄</span></summary><div><a href="#plan-essential" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); scrollToAnchor(event); }}>Essential <small>29 €/mes</small></a><a href="#plan-professional" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); scrollToAnchor(event); }}>Professional <small>79 €/mes</small></a><a href="#plan-business" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); scrollToAnchor(event); }}>Business <small>149 €/mes</small></a></div></details></nav>
      <div className="eos-home-nav-actions">
        <a className="eos-home-login" href="/EnterpriseOS/account/">Iniciar sesión</a>
        <a className="eos-home-workspace-link" href="/EnterpriseOS/" onClick={openDemoAccess}>Entrar al workspace <Arrow /></a>
        <a className="eos-home-button eos-home-button-small" href="/EnterpriseOS/" onClick={openDemoAccess}>Empezar ahora <Arrow /></a>
      </div>
    </header>

    <section className="eos-home-hero">
      <div className="eos-home-hero-copy">
        <div className="eos-home-kicker"><i /> FINANCIAL DECISION INTELLIGENCE</div>
        <h1>Entiende tu rentabilidad.<br /><em>Anticipa tu caja.</em></h1>
        <p>Analiza resultados, compara escenarios y prepara una previsión de tesorería de 13 semanas desde un único espacio de gestión financiera.</p>
        <div className="eos-home-hero-actions">
          <a className="eos-home-button" href="/EnterpriseOS/" onClick={openDemoAccess}>Probar demo <Arrow /></a>
          <a className="eos-home-text-link" href="/EnterpriseOS/account/">Ya tengo cuenta · Iniciar sesión <span>↗</span></a>
        </div>
        <div className="eos-home-proof"><span><i /> ANÁLISIS Y PLANIFICACIÓN FINANCIERA</span><span>DATOS INTRODUCIDOS POR TI · SIN CONEXIÓN BANCARIA</span></div>
      </div>
      <HeroVisual />
      <div className="eos-home-hero-index">01 <span /> FINANCIAL ATLAS</div>
    </section>

    <section className="eos-home-what" id="what">
      <div className="eos-home-section-top"><span>QUÉ HACEMOS</span><span>DEL DATO A UNA DECISIÓN MEJOR</span></div>
      <div className="eos-home-what-heading"><h2>De hojas dispersas<br /><em>a una visión clara.</em></h2><p>Reunimos los números clave de tu empresa en un espacio de gestión: ves cómo rinde, pruebas escenarios y anticipas la caja antes de decidir.</p></div>
      <div className="eos-home-process"><article><span>01 / INTRODUCE</span><h3>Parte de tus datos</h3><p>Añade ingresos, costes, presupuestos, cobros y pagos con tus propios supuestos.</p></article><div className="eos-home-process-line" aria-hidden="true"><svg viewBox="0 0 100 16"><path d="M1 8h96m-7-6 7 6-7 6"/></svg></div><article><span>02 / ANALIZA</span><h3>Entiende el impacto</h3><p>Consulta márgenes, compara escenarios y relaciona resultado, balance y caja.</p></article><div className="eos-home-process-line" aria-hidden="true"><svg viewBox="0 0 100 16"><path d="M1 8h96m-7-6 7 6-7 6"/></svg></div><article><span>03 / DECIDE</span><h3>Actúa con contexto</h3><p>Detecta necesidades de liquidez, revisa costes y comparte informes de gestión.</p></article></div>
      <div className="eos-home-benefits">{benefits.map((item) => <article className="eos-home-benefit" key={item.number}>
        <div className="eos-home-benefit-top"><span>{item.number}</span><BenefitIcon type={item.icon}/></div>
        <h3>{item.title}</h3><p>{item.copy}</p><div className="eos-home-benefit-line" />
      </article>)}</div>
    </section>


    <section className="eos-home-product" id="how-it-works">
      <div className="eos-home-section-top"><span>CÓMO FUNCIONA</span><span>INTRODUCE · ANALIZA · DECIDE</span></div>
      <div className="eos-home-product-heading">
        <div><div className="eos-home-kicker"><i /> EL WORKSPACE POR DENTRO</div><h2>Tu negocio, explicado<br /><em>en números claros.</em></h2></div>
        <p>EnterpriseOS reúne herramientas de análisis y planificación para que puedas entender el presente, probar decisiones y ver sus posibles consecuencias.</p>
      </div>
      <div className="eos-home-product-grid">
        <article className="eos-home-product-card eos-home-product-card-wide" onPointerMove={trackSurfacePointer}>
          <div className="eos-home-product-visual eos-home-visual-dashboard">
            <div className="eos-home-mini-top"><span>EXECUTIVE OVERVIEW</span><i>FY 2026 · DEMO</i></div>
            <div className="eos-home-mini-kpis"><div><small>REVENUE</small><b>€248k</b><i>↗ 8.4%</i></div><div><small>EBITDA</small><b>€51k</b><i>↗ 6.2%</i></div><div><small>CASH</small><b>€112k</b><i>↗ 4.1%</i></div></div>
            <div className="eos-home-mini-chart"><span style={{height:"34%"}}/><span style={{height:"45%"}}/><span style={{height:"42%"}}/><span style={{height:"57%"}}/><span style={{height:"64%"}}/><span style={{height:"78%"}}/><span style={{height:"88%"}}/></div>
          </div>
          <div className="eos-home-product-copy"><span>01 / VISIÓN EJECUTIVA</span><h3>Entiende cómo va tu empresa.</h3><p>Visualiza ingresos, costes, márgenes y resultados en un dashboard pensado para detectar lo importante de un vistazo.</p></div>
        </article>
        <article className="eos-home-product-card" onPointerMove={trackSurfacePointer}>
          <div className="eos-home-product-visual eos-home-visual-scenarios">
            <div className="eos-home-scenario-lines"><span>BASE <b>€248k</b><i style={{width:"72%"}}/></span><span>GROWTH <b>€286k</b><i style={{width:"91%"}}/></span><span>CONSERVATIVE <b>€218k</b><i style={{width:"58%"}}/></span></div>
            <div className="eos-home-scenario-note">3 ESCENARIOS COMPARABLES</div>
          </div>
          <div className="eos-home-product-copy"><span>02 / PLANIFICACIÓN</span><h3>Prueba antes de decidir.</h3><p>Modifica presupuestos y supuestos para comparar escenarios y medir su impacto en ingresos y rentabilidad.</p></div>
        </article>
        <article className="eos-home-product-card" onPointerMove={trackSurfacePointer}>
          <div className="eos-home-product-visual eos-home-visual-cash">
            <div className="eos-home-cash-head"><span>13-WEEK CASH VIEW</span><b>€112,400</b></div>
            <div className="eos-home-cash-bars">{[68,54,78,48,85,63,92,72,58,88,67,96,78].map((h,i)=><i key={i} style={{height:h+"%"}} />)}</div>
            <div className="eos-home-cash-legend"><span>ENTRADAS</span><span>SALIDAS</span></div>
          </div>
          <div className="eos-home-product-copy"><span>03 / TESORERÍA</span><h3>Anticipa tus necesidades de caja.</h3><p>Prepara una previsión manual de 13 semanas y sigue cobros, pagos y vencimientos pendientes.</p></div>
        </article>
        <article className="eos-home-product-card" onPointerMove={trackSurfacePointer}>
          <div className="eos-home-product-visual eos-home-visual-statements">
            <div className="eos-home-statement-row"><span>Income statement</span><b>EBITDA</b><i>€51.0k</i></div>
            <div className="eos-home-statement-row"><span>Balance sheet</span><b>ASSETS</b><i>€184.2k</i></div>
            <div className="eos-home-statement-row"><span>Cash flow</span><b>NET CASH</b><i>+€18.6k</i></div>
            <div className="eos-home-statement-link">RESULTADO ↔ BALANCE ↔ CAJA</div>
          </div>
          <div className="eos-home-product-copy"><span>04 / MODELO FINANCIERO</span><h3>Conecta los tres estados.</h3><p>Relaciona cuenta de resultados, balance y flujo de caja mediante supuestos editables en un modelo simplificado.</p></div>
        </article>
        <article className="eos-home-product-card" onPointerMove={trackSurfacePointer}>
          <div className="eos-home-product-visual eos-home-visual-operations">
            <div className="eos-home-ops-center">COSTES<br/><b>POR ÁREA</b></div>
            <div className="eos-home-ops-node node-a">SALES</div><div className="eos-home-ops-node node-b">OPS</div><div className="eos-home-ops-node node-c">ADMIN</div>
            <div className="eos-home-ops-ring"/>
          </div>
          <div className="eos-home-product-copy"><span>05 / OPERACIONES</span><h3>Localiza dónde se consume el margen.</h3><p>Registra y analiza costes por centro o área para añadir contexto operativo a la lectura financiera.</p></div>
        </article>
        <article className="eos-home-product-card" onPointerMove={trackSurfacePointer}>
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

    <section className="eos-home-pricing">
      <div className="eos-home-section-top"><span>PRECIOS</span><span>ACCESO AL FINANCIAL ATLAS</span></div>
      <div className="eos-home-pricing-intro">
        <div><div className="eos-home-kicker"><i /> PLANES MENSUALES</div><h2>Elige el nivel de<br /><em>claridad que necesitas.</em></h2></div>
        <p>Empieza con el control financiero esencial y amplía tus capacidades cuando tu empresa lo necesite. Todos los precios son mensuales, sin IVA.</p>
      </div>
      <div className="eos-home-pricing-grid" id="pricing">
        <article id="plan-essential" className={"eos-home-tier-card " + (highlightedPlan === "essential" ? "is-selected" : "")} onPointerMove={trackSurfacePointer}>
          <div className="eos-home-tier-top"><span>01 / ESSENTIAL</span><span>START</span></div>
          <h3>Essential</h3><p>Control financiero esencial para empresas pequeñas.</p>
          <div className="eos-home-tier-price"><strong>29 €</strong><span>/ mes</span></div>
          <div className="eos-home-feature-list"><div><b>Dashboard financiero</b><p>Ingresos, costes, EBITDA, márgenes y resultado neto en una vista ejecutiva.</p></div><div><b>Cuenta de resultados editable</b><p>Introduce ventas, costes directos, gastos, amortización, intereses e impuestos; los resultados se recalculan al instante.</p></div><div><b>Indicadores de rentabilidad</b><p>Consulta margen bruto, margen EBITDA y margen neto calculados a partir de tus datos.</p></div><div><b>Modelo de gestión</b><p>Trabaja con una vista anual en euros y supuestos modificables, sin contabilidad conectada.</p></div></div>
          <a className="eos-home-tier-link" href="/EnterpriseOS/" onClick={openDemoAccess}>Ver funciones en la demo <Arrow /></a>
        </article>
        <article id="plan-professional" className={"eos-home-tier-card is-recommended " + (highlightedPlan === "professional" ? "is-selected" : "")} onPointerMove={trackSurfacePointer}>
          <div className="eos-home-tier-top"><span>02 / PROFESSIONAL</span><span className="eos-home-recommended">RECOMENDADO</span></div>
          <h3>Professional</h3><p>Planificación y modelización para anticipar decisiones.</p>
          <div className="eos-home-tier-price"><strong>79 €</strong><span>/ mes</span></div>
          <div className="eos-home-feature-list"><div><b>Todo Essential</b><p>Dashboard, cuenta de resultados editable e indicadores de rentabilidad.</p></div><div><b>Presupuestos y escenarios</b><p>Define objetivos e hipótesis de ingresos y costes; compara escenarios y evolución mensual.</p></div><div><b>Modelo de tres estados</b><p>Relaciona cuenta de resultados, balance y flujo de caja con supuestos financieros editables.</p></div><div><b>Previsión de tesorería a 13 semanas</b><p>Proyecta manualmente entradas y salidas para anticipar tensiones de liquidez.</p></div><div><b>Capital circulante</b><p>Analiza plazos de cobro, inventario y pago a proveedores para entender el ciclo de caja.</p></div><div><b>Informes y Excel</b><p>Consulta el informe de gestión y exporta la cuenta de resultados para seguir trabajando.</p></div></div>
          <a className="eos-home-button eos-home-tier-cta" href="/EnterpriseOS/" onClick={openDemoAccess}>Probar Professional en la demo <Arrow /></a>
        </article>
        <article id="plan-business" className={"eos-home-tier-card " + (highlightedPlan === "business" ? "is-selected" : "")} onPointerMove={trackSurfacePointer}>
          <div className="eos-home-tier-top"><span>03 / BUSINESS</span><span>ADVANCED</span></div>
          <h3>Business</h3><p>Visión financiera y operativa ampliada.</p>
          <div className="eos-home-tier-price"><strong>149 €</strong><span>/ mes</span></div>
          <div className="eos-home-feature-list"><div><b>Todo Professional</b><p>Incluye planificación, tres estados financieros, tesorería, capital circulante e informes.</p></div><div><b>Pipeline comercial</b><p>Registra oportunidades, importes, fases y fechas previstas de cierre.</p></div><div><b>Seguimiento de proyectos</b><p>Controla responsables, presupuestos, gasto acumulado, fechas y estado.</p></div><div><b>Riesgos y KPIs</b><p>Documenta riesgos con su valoración y sigue indicadores frente a objetivos.</p></div><div><b>Centros de coste y gastos</b><p>Registra presupuestos, gasto y movimientos por área para entender dónde se consume el margen.</p></div><div><b>Exportación operativa</b><p>Descarga los registros operativos en CSV para analizarlos fuera de la plataforma.</p></div></div>
          <a className="eos-home-tier-link" href="/EnterpriseOS/" onClick={openDemoAccess}>Ver funciones en la demo <Arrow /></a>
        </article>
      </div>
      <div className="eos-home-pricing-foot"><p>Todos los planes son mensuales y se muestran sin IVA.</p><p><b>Alcance actual:</b> los datos se introducen manualmente y se guardan en el navegador. No hay conexión bancaria, sincronización contable, multiempresa ni almacenamiento centralizado activo. El alta y el cobro online se activarán al completar la configuración de Supabase y Stripe.</p></div>
    </section>

    <section className="eos-home-faq" id="faq">
      <div className="eos-home-section-top"><span>RESPUESTAS CLARAS</span><span>PRODUCTO · USO · PLANES</span></div>
      <div className="eos-home-faq-heading"><h2>Todo claro.<br /><em>Decisiones mejores.</em></h2><p>Una guía directa para entender el alcance del workspace, el trabajo financiero que centraliza y las capacidades de cada plan.</p></div>
      <div className="eos-home-faq-list">
        <details><summary><span>01</span> ¿Qué es EnterpriseOS y qué problema resuelve?</summary><p>EnterpriseOS es un workspace de análisis y planificación financiera. Reúne la cuenta de resultados de gestión, los indicadores de rentabilidad, los presupuestos, los escenarios y la previsión de caja para que dirección y finanzas puedan interpretar el rendimiento, anticipar necesidades de liquidez y evaluar decisiones con una visión común.</p></details>
        <details><summary><span>02</span> ¿Cómo se organiza el trabajo dentro del workspace?</summary><p>El flujo conecta cuatro tareas: registrar los datos de gestión, revisar el rendimiento, proyectar distintos escenarios y preparar decisiones. Puedes actualizar ingresos, costes, presupuestos, facturas por cobrar y pagos previstos; analizar márgenes y resultados; ajustar hipótesis; y revisar la previsión de tesorería de 13 semanas. Los datos y supuestos se introducen manualmente.</p></details>
        <details><summary><span>03</span> ¿Qué aporta cada paquete?</summary><p><b>Essential — 29 €/mes:</b> dashboard financiero, cuenta de resultados editable e indicadores de rentabilidad para controlar el rendimiento. <b>Professional — 79 €/mes:</b> añade presupuestos, escenarios, modelo simplificado de tres estados, previsión manual de caja a 13 semanas, capital circulante e informes de gestión para planificar y anticipar. <b>Business — 149 €/mes:</b> incorpora seguimiento de pipeline, proyectos, riesgos, KPIs, centros de coste y gastos para relacionar la gestión financiera con la actividad operativa. Precios mensuales previstos, sin IVA.</p></details>
        <details><summary><span>04</span> ¿Cómo ayuda a tomar decisiones mejores?</summary><p>Permite comparar el rendimiento real introducido con el presupuesto, comprobar cómo cambian los resultados al modificar supuestos y visualizar el efecto esperado sobre la caja. Así puedes detectar desviaciones, valorar alternativas y priorizar acciones con los datos disponibles, sin depender de hojas dispersas.</p></details>
        <details><summary><span>05</span> ¿Qué informes y modelos financieros incluye?</summary><p>Incluye una cuenta de resultados de gestión, análisis de márgenes, presupuestos y escenarios, un modelo simplificado que relaciona cuenta de resultados, balance y flujo de caja, una previsión manual de tesorería a 13 semanas e informes de gestión. No genera contabilidad oficial ni declaraciones fiscales.</p></details>
        <details><summary><span>06</span> ¿Se conecta automáticamente con bancos o programas contables?</summary><p>No. La información se introduce manualmente; esta versión no ofrece conexión bancaria ni sincronización contable. Los datos de trabajo se guardan localmente en el navegador y no existe almacenamiento centralizado por empresa ni copia de seguridad en servidor. No introduzcas información confidencial o datos sensibles reales.</p></details>
        <details><summary><span>07</span> ¿Los precios y la contratación están activos?</summary><p>Los importes publicados describen los niveles comerciales previstos, con facturación mensual y sin IVA. El registro y el cobro online todavía no están activados, por lo que no se puede completar una suscripción desde la web en este momento.</p></details>
        <details><summary><span>08</span> ¿Qué diferencia a EnterpriseOS?</summary><p>Su propuesta es reunir análisis de rendimiento, planificación y seguimiento de caja en un mismo flujo de gestión, con supuestos editables y una estructura progresiva por niveles. La elección adecuada depende de tus necesidades: si requieres integraciones automáticas, consolidación multiempresa, controles avanzados o procesos contables, comprueba que esas capacidades estén disponibles antes de contratar.</p></details>
      </div>
    </section>

    <section className="eos-home-close">
      <div className="eos-home-close-orbit" aria-hidden="true"><span /><span /><span /></div>
      <div className="eos-home-kicker"><i /> EL SIGUIENTE PASO</div>
      <h2>Entiende los números.<br /><em>Adelántate a las decisiones.</em></h2>
      <div className="eos-home-close-bottom"><p>Entra en EnterpriseOS y lleva tu planificación financiera a un lugar más claro.</p><a className="eos-home-button" href="/EnterpriseOS/" onClick={openDemoAccess}>Probar demo <Arrow /></a></div>
    </section>

    <footer className="eos-home-footer">
      <div className="eos-home-footer-main"><Brand /><p>Financial Decision Intelligence<br />para empresas que quieren decidir con contexto.</p></div>
      <div className="eos-home-footer-links"><a href="#what" onClick={scrollToAnchor}>Qué hacemos</a><a href="#how-it-works" onClick={scrollToAnchor}>Cómo funciona</a><a href="#pricing" onClick={scrollToAnchor}>Precios</a><a href="#faq" onClick={scrollToAnchor}>Preguntas frecuentes</a><a href="/EnterpriseOS/account/">Iniciar sesión</a><a href="/EnterpriseOS/" onClick={openDemoAccess}>Workspace demo</a></div>
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
