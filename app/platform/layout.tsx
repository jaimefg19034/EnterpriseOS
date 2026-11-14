import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./platform.css";
import "./platform/design-system.css";
import "./platform/hero.css";
import "./platform/capabilities.css";
import "./platform/product.css";
import "./platform/interactions.css";
import "./platform/scenario-matrix.css";
import "./platform/ticker.css";

const platformUrl = "https://jaimefg19034.github.io/EnterpriseOS/platform/";

export const metadata: Metadata = {
  metadataBase: new URL("https://jaimefg19034.github.io/EnterpriseOS/"),
  title: "EnterpriseOS — The Financial Atlas",
  description:
    "Conecta planificación, resultados y tesorería para entender qué está ocurriendo y qué puede ocurrir después.",
  applicationName: "EnterpriseOS",
  keywords: [
    "financial decision intelligence",
    "planificación financiera",
    "análisis financiero",
    "previsión de tesorería",
    "escenarios financieros",
    "control de gestión",
  ],
  alternates: {
    canonical: platformUrl,
  },
  openGraph: {
    title: "EnterpriseOS — Claridad financiera para decidir mejor",
    description:
      "Un atlas financiero para modelar escenarios, leer la tesorería y decidir con contexto.",
    url: platformUrl,
    siteName: "EnterpriseOS",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "EnterpriseOS — The Financial Atlas",
    description:
      "Planifica, modela escenarios y entiende el impacto financiero de cada decisión.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PlatformLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
