"use client";

import { useState } from "react";
import PlatformHeader from "./components/PlatformHeader";
import PlatformFooter from "./components/PlatformFooter";
import EditorialHero from "./components/EditorialHero";
import ManifestoSection from "./components/ManifestoSection";
import TrustSection from "./components/TrustSection";
import CapabilityBento from "./components/CapabilityBento";
import ProductShowcase from "./components/ProductShowcase";
import DecisionField from "./components/DecisionField";
import ScenarioMatrix from "./components/ScenarioMatrix";
import ProductAnatomy from "./components/ProductAnatomy";
import ConversionSection from "./components/ConversionSection";
import { type Scenario } from "./components/scenarios";
import MobileDock from "./components/MobileDock";

export default function PlatformPage() {
  const [scenario, setScenario] = useState<Scenario>("base");
  return (
    <main className="p-site" id="main-content">
      <a className="p-skip-link" href="#platform-hero-title">Saltar al contenido principal</a>
      <PlatformHeader />

      <EditorialHero scenario={scenario} />

      <section className="p-principles" aria-label="Principios de EnterpriseOS">
        <div className="p-principle-lead">UNA MEJOR LECTURA<br /><b>CAMBIA LA DECISIÓN.</b></div>
        {[[ "01", "Modelar", "Entender los motores del negocio" ], [ "02", "Planificar", "Contrastar hipótesis y escenarios" ], [ "03", "Anticipar", "Leer el impacto en caja" ], [ "04", "Decidir", "Actuar con contexto" ]].map(item => <div className="p-principle" key={item[0]}><small>{item[0]}</small><b>{item[1]}</b><span>{item[2]}</span></div>)}
      </section>

      <div className="p-ticker" aria-hidden="true"><div className="p-ticker-track" aria-hidden="true">{["MODEL / DECIDE","SCENARIOS / OUTLOOK","LIQUIDITY / 13 WEEKS","MANAGEMENT P&L","PLAN / ACTUAL / VARIANCE","MODEL / DECIDE","SCENARIOS / OUTLOOK","LIQUIDITY / 13 WEEKS","MANAGEMENT P&L","PLAN / ACTUAL / VARIANCE"].map((item, index) => <span key={index}>{item}<i>✳</i></span>)}</div></div>


      <div className="p-ticker p-ticker-secondary" aria-label="Principios del producto">
        <div className="p-ticker-track" aria-hidden="true">
          {["MANUAL INPUTS · CLEARLY MARKED","ILLUSTRATIVE DATA · NOT LIVE","LOCAL PERSISTENCE · MVP","NO BANK FEED · NO FALSE PROMISES","MODEL / EXPLAIN / DECIDE","MANUAL INPUTS · CLEARLY MARKED","ILLUSTRATIVE DATA · NOT LIVE","LOCAL PERSISTENCE · MVP","NO BANK FEED · NO FALSE PROMISES","MODEL / EXPLAIN / DECIDE"].map((item, index) => <span key={index}>{item}<i>✳</i></span>)}
        </div>
      </div>
\n      <ManifestoSection />

      <TrustSection />

      <CapabilityBento />

      <ProductShowcase />

      <DecisionField scenario={scenario} onScenarioChange={setScenario} />

      <ScenarioMatrix scenario={scenario} onScenarioChange={setScenario} />

      <ProductAnatomy />

      <ConversionSection />

      <PlatformFooter />
      <MobileDock />
    </main>
  );
}
