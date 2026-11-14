import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./enterprise-design.css";
import "./executive-overhaul.css";

export const metadata: Metadata = {
  title: "EnterpriseOS — Sistema operativo financiero",
  description:
    "El espacio de trabajo financiero para planificar, analizar y dirigir empresas en crecimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
