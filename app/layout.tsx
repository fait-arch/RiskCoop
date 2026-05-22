import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiskCoop | Alerta temprana de mora",
  description: "Dashboard predictivo para riesgo crediticio cooperativo",
  appleWebApp: {
    capable: true,
    title: "RiskCoop",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a1a1a',
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
