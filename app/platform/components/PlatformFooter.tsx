import BrandMark from "../../components/ui/BrandMark";
import Arrow from "../../components/ui/Arrow";

export default function PlatformFooter() {
  return (
    <footer className="p-footer"><div className="p-footer-main"><a className="p-brand" href="/EnterpriseOS/"><BrandMark /><span>Enterprise<span>OS</span><small>FINANCE OPERATING SYSTEM</small></span></a><p>Un espacio de trabajo para planificar, analizar y dirigir.</p></div><div className="p-footer-links"><div><small>EXPLORE</small><a href="#manifesto">Enfoque</a><a href="#capabilities">Capacidades</a><a href="#product">Producto</a></div><div><small>WORKSPACE</small><a href="/EnterpriseOS/">Abrir aplicación <Arrow /></a><a href="#simulator">Simulador</a></div></div><div className="p-footer-bottom"><span>© 2026 ENTERPRISEOS</span><span>PLAN / MODEL / ANTICIPATE / DECIDE</span><span>DEMO · LOCAL DATA · ILLUSTRATIVE CONTENT</span></div></footer>
  );
}
