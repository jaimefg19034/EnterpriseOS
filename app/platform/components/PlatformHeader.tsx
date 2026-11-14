import BrandMark from "../../components/ui/BrandMark";
import Arrow from "../../components/ui/Arrow";

const navigation = [
  ["#manifesto", "Enfoque"],
  ["#capabilities", "Capacidades"],
  ["#product", "Producto"],
  ["#simulator", "Escenarios"],
] as const;

export default function PlatformHeader() {
  return (
    <header className="p-nav">
      <a className="p-brand" href="/EnterpriseOS/" aria-label="EnterpriseOS, abrir workspace">
        <BrandMark />
        <span>Enterprise<span>OS</span><small>FINANCE OPERATING SYSTEM</small></span>
      </a>
      <nav className="p-desktop-nav" aria-label="Navegación principal">
        {navigation.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
      </nav>
      <details className="p-mobile-menu">
        <summary aria-label="Abrir navegación"><span>MENÚ</span><i aria-hidden="true" /></summary>
        <nav aria-label="Navegación móvil">
          {navigation.map(([href, label]) => <a href={href} key={href}>{label}<span aria-hidden="true">↗</span></a>)}
        </nav>
      </details>
      <a className="p-nav-cta" href="/EnterpriseOS/">Abrir workspace <Arrow /></a>
    </header>
  );
}
