import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./platform.css";
import "./platform/design-system.css";
import "./platform/hero.css";
import "./platform/capabilities.css";
import "./platform/product.css";
import "./platform/interactions.css";

export const metadata: Metadata = {
  title: "EnterpriseOS — The Financial Atlas",
  description:
    "Conecta planificación, resultados y tesorería para entender qué está ocurriendo y qué puede ocurrir después.",
  openGraph: {
    title: "EnterpriseOS — Claridad financiera para decidir mejor",
    description:
      "Un atlas financiero para modelar escenarios, leer la tesorería y decidir con contexto.",
    type: "website",
  },
};

export default function PlatformLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
