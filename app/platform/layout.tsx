import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "EnterpriseOS — Claridad financiera para decidir mejor",
  description:
    "Un espacio de trabajo para modelización financiera, presupuestos, escenarios, previsión de tesorería y análisis de gestión.",
  openGraph: {
    title: "EnterpriseOS — Claridad financiera para decidir mejor",
    description:
      "Modela, planifica y entiende las finanzas de tu empresa desde un espacio de trabajo conectado.",
    type: "website",
  },
};

export default function PlatformLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children;
}
