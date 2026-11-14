import BrandMark from "../../components/ui/BrandMark";
import Arrow from "../../components/ui/Arrow";

const footerNavigation = [
  { title: "EXPLORAR", links: [["#manifesto", "Enfoque"], ["#capabilities", "Capacidades"], ["#product", "Producto"]] },
  { title: "WORKSPACE", links: [["/EnterpriseOS/", "Abrir aplicación"], ["#simulator", "Explorar escenarios"]] },
] as const;

export default function PlatformFooter() {
  return (
    <footer className="p-footer">
      <div className="p-footer-main">
        <a className="p-brand" href="/EnterpriseOS/" aria-label="EnterpriseOS, abrir workspace">
          <BrandMark />
          <span>Enterprise<span>OS</span><small>FINANCIAL DECISION INTELLIGENCE</small></span>
        </a>
        <p>Un espacio de trabajo para planificar, analizar y dirigir con perspectiva financiera.</p>
      </div>
      <div className="p-footer-links">
        {footerNavigation.map((group) => (
          <div key={group.title}>
            <small>{group.title}</small>
            {group.links.map(([href, label]) => (
              <a href={href} key={href}>{label}{href === "/EnterpriseOS/" && <Arrow />}</a>
            ))}
          </div>
        ))}
      </div>
      <div className="p-footer-bottom">
        <span>© {new Date().getFullYear()} ENTERPRISEOS</span>
        <span>PLAN / MODEL / ANTICIPATE / DECIDE</span>
        <span>LOCAL DATA · ILLUSTRATIVE CONTENT</span>
      </div>
    </footer>
  );
}
