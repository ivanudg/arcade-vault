/**
 * Acceso de jugadores. Puerto de references/templates/cuenta.dc.html.
 * Toda la pantalla es la tarjeta del panel, centrada.
 */

import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";

export const metadata: Metadata = {
  title: "ACCESO DE JUGADORES · Arcade Vault",
  description: "Guarda tus récords y compite en el salón.",
};

export default function AccountPage() {
  return (
    <main className="flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(22px,4vw,44px)] pb-22.5">
      <section className="mx-auto grid w-full max-w-310 place-items-center py-[clamp(10px,4vw,40px)] animate-av-fade">
        <AuthPanel />
      </section>
    </main>
  );
}
