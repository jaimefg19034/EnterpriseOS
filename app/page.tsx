"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    window.location.replace("/EnterpriseOS/platform/");
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", background: "#080d18", color: "#f4f6fb", fontFamily: "Arial, sans-serif" }}>
      <p>Abriendo EnterpriseOS… <a href="/EnterpriseOS/platform/" style={{ color: "#9fb4ff" }}>Continuar a la página principal</a></p>
    </main>
  );
}
