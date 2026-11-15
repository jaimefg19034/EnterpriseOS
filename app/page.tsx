"use client";

// The root route renders the same landing component as /platform, so it must
// load the platform design styles as well. Keep these paths aligned with
// app/platform/layout.tsx.
import "./platform/platform.css";
import "./platform/platform/tokens.css";
import "./platform/platform/design-system.css";
import "./platform/platform/hero.css";
import "./platform/platform/capabilities.css";
import "./platform/platform/product.css";
import "./platform/platform/interactions.css";
import "./platform/platform/scenario-matrix.css";
import "./platform/platform/ticker.css";
import "./platform/platform/motion-mobile.css";
import "./platform/radical-art-direction.css";
import "./platform/atlas-rebuild.css";
import "./platform/conversion-landing.css";

import AtlasLanding from "./platform/components/AtlasLanding";

export default function Home() {
  return <AtlasLanding />;
}
