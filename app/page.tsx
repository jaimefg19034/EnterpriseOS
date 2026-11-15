"use client";

// The root route renders the same landing component as /platform, so it must
// load the platform design styles as well. The platform route gets these from
// app/platform/layout.tsx; the root route does not inherit that nested layout.
import "./platform/platform.css";
import "./platform/tokens.css";
import "./platform/design-system.css";
import "./platform/hero.css";
import "./platform/capabilities.css";
import "./platform/product.css";
import "./platform/interactions.css";
import "./platform/scenario-matrix.css";
import "./platform/ticker.css";
import "./platform/motion-mobile.css";
import "./platform/radical-art-direction.css";
import "./platform/atlas-rebuild.css";
import "./platform/conversion-landing.css";

import AtlasLanding from "./platform/components/AtlasLanding";

export default function Home() {
  return <AtlasLanding />;
}
