"use client";

import { useEffect, useRef, useState } from "react";
import BrandMark from "../../components/ui/BrandMark";
import Arrow from "../../components/ui/Arrow";

const navigation = [
  ["#manifesto", "Enfoque", "La filosofía detrás de una lectura financiera más clara.", "01 / PRINCIPLES"],
  ["#capabilities", "Capacidades", "Modelo, planificación, liquidez y reporting en un solo recorrido.", "02 / SYSTEM"],
  ["#product", "Producto", "Inspecciona el workspace y sus herramientas reales.", "03 / WORKSPACE"],
  ["#simulator", "Escenarios", "Cambia una hipótesis y compara sus consecuencias.", "04 / DECISION FIELD"],
  ["#scenario-comparison", "Comparar", "Contrasta rentabilidad, ingresos y caja.", "05 / SCENARIO MATRIX"],
] as const;

export default function PlatformHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current?.querySelector<HTMLElement>(".p-mega-menu");
    const focusable = menu?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="p-nav">
      <a className="p-brand" href="/EnterpriseOS/" aria-label="EnterpriseOS, abrir workspace">
        <BrandMark />
        <span>Enterprise<span>OS</span><small>FINANCIAL DECISION INTELLIGENCE</small></span>
      </a>
      <nav className="p-desktop-nav" aria-label="Navegación principal">
        {navigation.slice(0, 4).map(([href, label]) => <a href={href} key={href}>{label}</a>)}
      </nav>
      <div className="p-menu-system" ref={menuRef}>
        <button
          ref={triggerRef}
          className="p-menu-trigger"
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-controls="p-mega-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span>{menuOpen ? "CERRAR" : "EXPLORAR"}</span><i aria-hidden="true" />
        </button>
        {menuOpen && (
          <div className="p-mega-menu" id="p-mega-menu" role="dialog" aria-modal="true" aria-label="Explorar EnterpriseOS">
            <div className="p-mega-menu-top">
              <span>ENTERPRISEOS <i>/</i> THE FINANCIAL ATLAS</span>
              <button type="button" onClick={closeMenu} aria-label="Cerrar menú">CERRAR <b>×</b></button>
            </div>
            <div className="p-mega-menu-body">
              <div className="p-mega-menu-main">
                <span className="p-mega-kicker">NAVEGACIÓN / 01—05</span>
                <nav className="p-mega-links" aria-label="Secciones del sitio">
                  {navigation.map(([href, label, description], index) => (
                    <a href={href} key={href} onClick={closeMenu}>
                      <small>0{index + 1}</small><strong>{label}</strong><span>{description}</span><i aria-hidden="true">↗</i>
                    </a>
                  ))}
                </nav>
              </div>
              <aside className="p-mega-preview" aria-label="Vista previa del producto">
                <div className="p-mega-preview-head"><span>FIELD PREVIEW / 001</span><span>ILLUSTRATIVE DATA</span></div>
                <div className="p-mega-preview-art">
                  <div className="p-mega-orbit p-mega-orbit-one" /><div className="p-mega-orbit p-mega-orbit-two" />
                  <div className="p-mega-preview-core"><b>EOS</b><span>MODEL<br />→ DECIDE</span></div>
                  <i className="p-mega-node p-mega-node-one" /><i className="p-mega-node p-mega-node-two" /><i className="p-mega-node p-mega-node-three" />
                </div>
                <div className="p-mega-preview-copy"><b>Una lectura. Múltiples futuros.</b><p>Explora cómo se relacionan el rendimiento, la planificación y la caja.</p></div>
                <a className="p-mega-workspace" href="/EnterpriseOS/" onClick={closeMenu}>ABRIR WORKSPACE <Arrow /></a>
              </aside>
            </div>
            <div className="p-mega-menu-foot"><span>MANUAL INPUTS · LOCAL DATA · MVP SCOPE</span><span>PLAN / MODEL / ANTICIPATE / DECIDE</span></div>
          </div>
        )}
      </div>
      <a className="p-nav-cta" href="/EnterpriseOS/">Abrir workspace <Arrow /></a>
    </header>
  );
}
