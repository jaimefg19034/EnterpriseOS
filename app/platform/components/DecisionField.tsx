import type { PointerEvent } from "react";
import TechnicalLabel from "../../components/ui/TechnicalLabel";
import { scenarios, type Scenario } from "./scenarios";

function trackDecisionLight(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType === "touch") return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
  event.currentTarget.style.setProperty("--decision-x", `${x}%`);
  event.currentTarget.style.setProperty("--decision-y", `${y}%`);
  event.currentTarget.style.setProperty("--decision-tilt-x", `${((50 - y) / 50) * 1.1}deg`);
  event.currentTarget.style.setProperty("--decision-tilt-y", `${((x - 50) / 50) * 1.4}deg`);
}

function resetDecisionLight(event: PointerEvent<HTMLDivElement>) {
  ["--decision-x", "--decision-y", "--decision-tilt-x", "--decision-tilt-y"].forEach(property => event.currentTarget.style.removeProperty(property));
}

export default function DecisionField({ scenario, onScenarioChange }: { scenario: Scenario; onScenarioChange: (scenario: Scenario) => void }) {
  const active = scenarios[scenario];

  return (
    <section className="p-simulator" id="simulator" aria-labelledby="decision-field-title">
      <div className="p-sim-copy">
        <TechnicalLabel number="05">THE DECISION FIELD</TechnicalLabel>
        <h2 id="decision-field-title">Un supuesto cambia.<br /><em>La perspectiva también.</em></h2>
        <p>Un modelo financiero sirve cuando permite explorar consecuencias. Cambia la hipótesis y observa cómo varía esta demostración ilustrativa.</p>
        <div className="p-switch" role="group" aria-label="Seleccionar escenario financiero">
          {(Object.keys(scenarios) as Scenario[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => onScenarioChange(key)}
              className={scenario === key ? "active" : ""}
              aria-pressed={scenario === key}
            >
              {scenarios[key].label}
            </button>
          ))}
        </div>
        <div className="p-note" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true">↳</span>
          {active.note}
        </div>
      </div>

      <div className="p-sim-panel" onPointerMove={trackDecisionLight} onPointerLeave={resetDecisionLight} onPointerCancel={resetDecisionLight} role="group" aria-label={`Resultados ilustrativos del escenario ${active.label}`} aria-describedby="decision-field-disclaimer">
        <div className="p-sim-top">
          <span>ILLUSTRATIVE MODEL / 2026</span>
          <b><i aria-hidden="true" /> SCENARIO ACTIVE</b>
        </div>

        <div className="p-sim-context">
          <span>ESCENARIO SELECCIONADO</span>
          <strong>{active.label}</strong>
          <span className={scenario === "base" ? "p-sim-delta is-base" : "p-sim-delta"}>
            {active.delta} <small>INGRESOS VS. BASE</small>
          </span>
        </div>

        <div className="p-values" aria-live="polite" aria-atomic="true">
          <div><small>INGRESOS</small><strong>{active.revenue}</strong><span>Proyección anual</span></div>
          <div><small>EBITDA</small><strong>{active.ebitda}</strong><span>Resultado operativo</span></div>
          <div><small>CAJA PREVISTA</small><strong>{active.cash}</strong><span>Posición estimada</span></div>
        </div>

        <div className="p-sim-bars" aria-label="Índice ilustrativo por escenario, con base igual a 100">
          {([["Ingresos", active.bars[0]], ["EBITDA", active.bars[1]], ["Caja", active.bars[2]]] as [string, number][]).map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <i><b style={{ width: `${(value / 140) * 100}%` }} /></i><small>{value}</small>
            </div>
          ))}
        </div>

        <div className="p-sim-foot">
          <span>ÍNDICE RELATIVO · BASE = 100</span>
          <span>NO LIVE DATA CONNECTED</span>
        </div>
        <p className="p-sim-disclaimer" id="decision-field-disclaimer">Ejemplo sintético, no asociado a una empresa real. Los índices comparan cada escenario con el escenario base; las cifras se muestran redondeadas.</p>
      </div>
    </section>
  );
}
