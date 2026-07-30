import type { Metadata } from "next";
import { Courier_Prime, Press_Start_2P } from "next/font/google";
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
  // Cada pantalla pone su nombre y la plantilla añade la marca. El `default`
  // cubre lo que no lo declara, como el 404.
  title: {
    default: "Arcade Vault",
    template: "%s · Arcade Vault",
  },
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
        {/* Fondo y sesión son de todas las pantallas. La cabecera y el pie
            generales viven en app/(vault)/layout.tsx, porque /jugar/[id] tiene
            su propia cabecera reducida y no lleva pie. */}
        <VaultBackdrop />
        <SessionProvider>
          {/* Sin z-index a propósito: así no crea contexto de apilamiento y los
              z-index de dentro compiten con los del fondo igual que en las
              plantillas — rejilla 0, cabecera 40, scanlines 50, superpuestos de
              juego 55 y 60. Con `z-2` aquí, las scanlines taparían los
              superpuestos. Va por encima de la rejilla por orden en el DOM. */}
          <div className="relative flex flex-1 flex-col">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
