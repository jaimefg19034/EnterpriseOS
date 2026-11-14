import type { PointerEvent } from "react";
import TechnicalLabel from "../../components/ui/TechnicalLabel";
import { scenarios, type Scenario } from "./scenarios";

const order: Scenario[] = ["conservador", "base", "crecimiento"];
function trackScenarioLight(event: PointerEvent<HTMLButtonElement>) {
  if (event.pointerType === "touch") return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
  event.currentTarget.style.setProperty("--scenario-x", `${x}%`);
  event.currentTarget.style.setProperty("--scenario-y", `${y}%`);
  event.currentTarget.style.setProperty("--scenario-tilt-x", `${((50 - y) / 50) * 1.8}deg`);
  event.currentTarget.style.setProperty("--scenario-tilt-y", `${((x - 50) / 50) * 2.2}deg`);
}

function resetScenarioLight(event: PointerEvent<HTMLButtonElement>) {
  ["--scenario-x", "--scenario-y", "--scenario-tilt-x", "--scenario-tilt-y"].forEach(property => event.currentTarget.style.removeProperty(property));
}

const codes: Record<Scenario, string> = {
  conservador: "DOWNSIDE",
  base: "REFERENCE",
  crecimiento: "UPSIDE",
};

export default function ScenarioMatrix({
  scenario,
  onScenarioChange,
}: {
  scenario: Scenario;
  onScenarioChange: (scenario: Scenario) => void;
}) {
  return (
    <section className="p-scenario-matrix" id="scenario-comparison" aria-labelledby="scenario-matrix-title">
      <div className="p-scenario-matrix-head">
        <TechnicalLabel number="06">SCENARIO COMPARISON</TechnicalLabel>
        <span>ONE BASELINE / THREE OUTCOMES</span>
      </div>
      <div className="p-scenario-matrix-intro">
        <h2 id="scenario-matrix-title">Compara el resultado.<br /><em>No solo el crecimiento.</em></h2>
        <p>Tres hipótesis, una misma referencia. El objetivo no es elegir la cifra más alta: es entender el equilibrio entre ingresos, rentabilidad y caja.</p>
      </div>
      <div className="p-scenario-cards" role="group" aria-label="Comparación de escenarios financieros">
        {order.map((key, index) => {
          const item = scenarios[key];
          const selected = scenario === key;
          return (
            <button
              className="p-scenario-card"
              type="button"
              key={key}
              aria-pressed={selected}
              aria-label={`Seleccionar escenario ${item.label}`}
              onClick={() => onScenarioChange(key)}
              onPointerMove={trackScenarioLight}
              onPointerLeave={resetScenarioLight}
              onPointerCancel={resetScenarioLight}
            >
              <span className="p-scenario-card-top"><span>0{index + 1} / {codes[key]}</span><b>{item.delta}</b></span>
              <span className="p-scenario-card-title">{item.label}</span>
              <span className="p-scenario-card-metrics">
                <span><small>INGRESOS</small><strong>{item.revenue}</strong></span>
                <span><small>EBITDA</small><strong>{item.ebitda}</strong></span>
                <span><small>CAJA</small><strong>{item.cash}</strong></span>
              </span>
              <span className="p-scenario-card-foot"><span>ILLUSTRATIVE MODEL</span><span>{selected ? "SELECTED ✓" : "SELECT TO EXPLORE"}</span></span>
            </button>
          );
        })}
      </div>
      <p className="p-scenario-sr-status" role="status" aria-live="polite" aria-atomic="true">Escenario seleccionado: {scenarios[scenario].label}. Ingresos {scenarios[scenario].revenue}, EBITDA {scenarios[scenario].ebitda}, caja {scenarios[scenario].cash}.</p>
      <div className="p-scenario-matrix-note">
        <span>DEMO DATA · NO CUSTOMER CASE OR LIVE FINANCIAL DATA</span>
        <span>Seleccionar una tarjeta actualiza también la visualización del simulador.</span>
      </div>
    </section>
  );
}
