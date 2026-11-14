"use client";

import LiquidAtlasScene from "./LiquidAtlasScene";
import { scenarios, type Scenario } from "./scenarios";

export default function EditorialHero({ scenario }: { scenario: Scenario }) {
  const active = scenarios[scenario];
  return (
    <section className="p-hero p-hero-radical" aria-labelledby="platform-hero-title">
      <div className="p-hero-world" aria-hidden="true">
        <LiquidAtlasScene />
        <div className="p-hero-vignette" />
        <div className="p-hero-grain" />
        <div className="p-hero-orbit p-hero-orbit-a" />
        <div className="p-hero-orbit p-hero-orbit-b" />
        <div className="p-hero-orbit p-hero-orbit-c" />
        <div className="p-hero-crosshair p-hero-crosshair-a" />
        <div className="p-hero-crosshair p-hero-crosshair-b" />
      </div>

      <div className="p-hero-index">
        <span>ENTERPRISEOS <i aria-hidden="true">/</i> THE FINANCIAL ATLAS</span>
        <span>FINANCIAL DECISION INTELLIGENCE <b>FIELD / 001</b></span>
      </div>

      <div className="p-hero-radical-main">
        <div className="p-hero-copy">
          <div className="p-kicker"><i /> FINANCE, SEEN IN A DIFFERENT DIMENSION</div>
          <h1 id="platform-hero-title"><span className="p-hero-line-one">SEE THE</span><span className="p-hero-line-two">UNSEEN<span className="p-hero-period">.</span></span><span className="p-hero-line-three">MODEL <em>WHAT&apos;S</em> NEXT.</span></h1>
          <p>El futuro financiero de una empresa no es una cifra. Es un territorio de decisiones, hipótesis y consecuencias.</p>
          <div className="p-actions">
            <a className="p-button" href="/EnterpriseOS/">Entrar en el atlas <span aria-hidden="true">↗</span></a>
            <a className="p-link" href="#product">Inspeccionar el sistema <span>↓</span></a>
          </div>
        </div>

        <div className="p-hero-orbit-label p-hero-label-top"><small>FIG. 001 / LIVE MODEL</small><b>THE SHAPE<br />OF DECISIONS</b></div>
        <div className="p-hero-orbit-label p-hero-label-right"><small>SCENARIO / {active.label.toUpperCase()}</small><b>{active.revenue}</b><span>Revenue · illustrative</span></div>
        <div className="p-hero-orbit-label p-hero-label-bottom"><small>LIQUIDITY POSITION</small><b>{active.cash}</b><span>Cash · illustrative</span></div>
        <div className="p-hero-orbit-label p-hero-label-left"><small>OPERATING PERFORMANCE</small><b>{active.ebitda}</b><span>EBITDA · illustrative</span></div>
        <div className="p-hero-center-stamp"><span>EOS</span><i>FINANCIAL<br />ATLAS</i></div>
      </div>

      <div className="p-hero-radical-bottom">
        <div className="p-hero-scroll"><span>SCROLL TO ENTER THE SYSTEM</span><i /></div>
        <div className="p-hero-coordinate">40° 25&apos; N <b>·</b> 03° 42&apos; W <b>·</b> FINANCIAL TERRITORY / 001</div>
        <div className="p-hero-status"><i /> MANUAL INPUTS <b>·</b> ILLUSTRATIVE DATA</div>
      </div>
    </section>
  );
}
