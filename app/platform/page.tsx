"use client";

import { useEffect, useState } from "react";
import BrandMark from "../components/ui/BrandMark";
import PlatformHeader from "./components/PlatformHeader";
import PlatformFooter from "./components/PlatformFooter";
import EditorialHero from "./components/EditorialHero";
import ManifestoSection from "./components/ManifestoSection";
import TrustSection from "./components/TrustSection";
import CapabilityBento from "./components/CapabilityBento";
import ProductShowcase from "./components/ProductShowcase";
import DecisionField from "./components/DecisionField";
import ProductAnatomy from "./components/ProductAnatomy";
import ConversionSection from "./components/ConversionSection";
import { type Scenario } from "./components/scenarios";

export default function PlatformPage() {
  const [scenario, setScenario] = useState<Scenario>("base");
  const [introReady, setIntroReady] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setIntroReady(true), 520); return () => window.clearTimeout(timer); }, []);
  return (
    <main className={introReady ? "p-site p-loaded" : "p-site"}>
      <div className="p-preloader" aria-hidden={introReady}><BrandMark /><span>ENTERPRISEOS</span><i /></div>
      <PlatformHeader />

      <EditorialHero scenario={scenario} />

      <section className="p-principles" aria-label="Principios de EnterpriseOS">
        <div className="p-principle-lead">UNA MEJOR LECTURA<br /><b>CAMBIA LA DECISIÓN.</b></div>
        {[[ "01", "Modelar", "Entender los motores del negocio" ], [ "02", "Planificar", "Contrastar hipótesis y escenarios" ], [ "03", "Anticipar", "Leer el impacto en caja" ], [ "04", "Decidir", "Actuar con contexto" ]].map(item => <div className="p-principle" key={item[0]}><small>{item[0]}</small><b>{item[1]}</b><span>{item[2]}</span></div>)}
      </section>

      <ManifestoSection />

      <TrustSection />

      <CapabilityBento />

      <ProductShowcase />

      <DecisionField scenario={scenario} onScenarioChange={setScenario} />

      <ProductAnatomy />

      <ConversionSection />

      <PlatformFooter />
    </main>
  );
}
