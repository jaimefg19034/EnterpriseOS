"use client";

import BrandMark from "../../components/ui/BrandMark";
import Arrow from "../../components/ui/Arrow";

export default function PlatformHeader() {
  return (
    <header className="p-nav">
      <a className="p-brand" href="/EnterpriseOS/" aria-label="EnterpriseOS, abrir workspace"><BrandMark /><span>Enterprise<span>OS</span><small>FINANCE OPERATING SYSTEM</small></span></a>
      <nav aria-label="Navegación principal"><a href="#manifesto">Enfoque</a><a href="#capabilities">Capacidades</a><a href="#product">Producto</a><a href="#simulator">Escenarios</a></nav>
      <a className="p-nav-cta" href="/EnterpriseOS/">Abrir workspace <Arrow /></a>
    </header>
  );
}
