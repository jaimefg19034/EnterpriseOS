import Arrow from "../../components/ui/Arrow";

const destinations = [
  { href: "#product", label: "PRODUCTO", index: "01" },
  { href: "#simulator", label: "SIMULAR", index: "02" },
  { href: "#scenario-comparison", label: "ESCENARIOS", index: "03" },
];

export default function MobileDock() {
  return (
    <nav className="p-mobile-dock" aria-label="Accesos rápidos">
      {destinations.map((item) => (
        <a href={item.href} key={item.href}>
          <small>{item.index}</small>
          <span>{item.label}</span>
        </a>
      ))}
      <a className="p-mobile-dock-primary" href="/EnterpriseOS/">
        <span>WORKSPACE</span>
        <Arrow />
      </a>
    </nav>
  );
}
