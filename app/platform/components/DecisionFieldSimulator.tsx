import Arrow from "../../components/ui/Arrow";
import TechnicalLabel from "../../components/ui/TechnicalLabel";
import { scenarios, type Scenario } from "./scenarios";

export default function DecisionFieldSimulator({ scenario, onScenarioChange }: { scenario: Scenario; onScenarioChange: (scenario: Scenario) => void }) {
  const active = scenarios[scenario];
  return (
    <section className="p-simulator" id="simulator">
        <div className="p-sim-copy"><TechnicalLabel number="05">THE DECISION FIELD</SectionLabel><h2>Un supuesto cambia.<br /><em>La perspectiva también.</em></h2><p>Un modelo financiero sirve cuando permite explorar consecuencias. Cambia la hipótesis y observa cómo varía esta demostración ilustrativa.</p><div className="p-switch" role="group" aria-label="Seleccionar escenario">{(Object.keys(scenarios) as Scenario[]).map(key => <button key={key} onClick={() => onScenarioChange(key)} className={scenario === key ? "active" : ""} aria-pressed={scenario === key}>{scenarios[key].label}</button>)}</div><div className="p-note" aria-live="polite"><span>↳</span>{active.note}</div></div>
        <div className="p-sim-panel"><div className="p-sim-top"><span>ILLUSTRATIVE MODEL / 2026</span><b><i /> SCENARIO ACTIVE</b></div><div className="p-values"><div><small>INGRESOS</small><strong>{active.revenue}</strong><span>Proyección anual</span></div><div><small>EBITDA</small><strong>{active.ebitda}</strong><span>Resultado operativo</span></div><div><small>CAJA PREVISTA</small><strong>{active.cash}</strong><span>Posición estimada</span></div></div><div className="p-sim-bars">{[[ "Ingresos", active.bars[0] ],[ "EBITDA", active.bars[1] ],[ "Liquidez", active.bars[2] ]].map(row=><div key={row[0]}><span>{row[0]}</span><i><b style={{ width: `${row[1]}%` }} /></i></div>)}</div><div className="p-sim-foot"><span>BASE / DOWNSIDE / UPSIDE</span><span>NO LIVE DATA CONNECTED</span></div></div>
      </section>
  );
}
