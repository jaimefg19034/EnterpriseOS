import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./enterprise-design.css";
import "./executive-overhaul.css";
import "./account.css";
import "./mobile-fix.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "EnterpriseOS — Sistema operativo financiero",
  description: "El espacio de trabajo financiero para planificar, analizar y dirigir empresas en crecimiento.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
