"use client";

import { useEffect, useRef, useState } from "react";
import BrandMark from "../../components/ui/BrandMark";
import Arrow from "../../components/ui/Arrow";

const navigation = [
  ["#manifesto", "Enfoque"],
  ["#capabilities", "Capacidades"],
  ["#product", "Producto"],
  ["#simulator", "Escenarios"],
] as const;

export default function PlatformHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
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
        {navigation.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
      </nav>
      <div className="p-mobile-menu" ref={menuRef}>
        <button
          className="p-mobile-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Cerrar navegación" : "Abrir navegación"}
          aria-expanded={menuOpen}
          aria-controls="p-mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span>{menuOpen ? "CERRAR" : "MENÚ"}</span>
          <i aria-hidden="true" />
        </button>
        {menuOpen && (
          <nav id="p-mobile-navigation" className="p-mobile-navigation" aria-label="Navegación móvil">
            {navigation.map(([href, label]) => (
              <a href={href} key={href} onClick={closeMenu}>{label}<span aria-hidden="true">↗</span></a>
            ))}
          </nav>
        )}
      </div>
      <a className="p-nav-cta" href="/EnterpriseOS/">Abrir workspace <Arrow /></a>
    </header>
  );
}
