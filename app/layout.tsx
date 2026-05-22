import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiskCoop | Alerta temprana de mora",
  description: "Dashboard predictivo para riesgo crediticio cooperativo"
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
