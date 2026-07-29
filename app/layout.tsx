import type { Metadata } from "next";
import { Courier_Prime, Press_Start_2P } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VaultBackdrop } from "@/components/vault-backdrop";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

// Display de píxel: rótulos, botones y marcadores. Sólo existe en 400.
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Cuerpo monoespaciado: todo lo demás, incluidos los inputs.
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Juega online y compite por el puntaje más alto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-av-bg text-av-text font-mono tracking-av">
        <VaultBackdrop />
        <SessionProvider>
          {/* El contenido va por encima de la rejilla (z-0) y por debajo de las
              scanlines (z-50), igual que el z-index 2 de las plantillas. */}
          <div className="relative z-2 flex flex-1 flex-col">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
