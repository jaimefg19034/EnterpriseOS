import TechnicalLabel from "../../components/ui/TechnicalLabel";
import { scenarios, type Scenario } from "./scenarios";

const order: Scenario[] = ["conservador", "base", "crecimiento"];
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
            >
              <div className="p-scenario-card-top"><span>0{index + 1} / {codes[key]}</span><b>{item.delta}</b></div>
              <h3>{item.label}</h3>
              <div className="p-scenario-card-metrics">
                <div><small>INGRESOS</small><strong>{item.revenue}</strong></div>
                <div><small>EBITDA</small><strong>{item.ebitda}</strong></div>
                <div><small>CAJA</small><strong>{item.cash}</strong></div>
              </div>
              <div className="p-scenario-card-foot"><span>ILLUSTRATIVE MODEL</span><span>{selected ? "SELECTED ✓" : "SELECT TO EXPLORE"}</span></div>
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
