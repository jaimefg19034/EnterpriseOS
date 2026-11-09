import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnterpriseOS — Financial workspace",
  description:
    "A focused financial modelling and business-analysis workspace for growing companies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
