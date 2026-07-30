/**
 * Biblioteca: la portada del vault.
 *
 * Puerto de references/templates/biblioteca.dc.html. El rótulo y el subtítulo
 * son estáticos, así que se quedan en el servidor; sólo el buscador y la
 * rejilla bajan a cliente.
 *
 * El ancho máximo va en el envoltorio interior y el relleno en el `<main>`:
 * las plantillas usan `box-sizing: content-box`, así que sus 1240px son de
 * contenido. Con el `border-box` de Tailwind, juntarlo todo en un elemento
 * restaría el relleno y la rejilla saldría 80px más estrecha.
 */

import type { Metadata } from "next";
import { LibraryBrowser } from "@/components/library-browser";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = {
  title: "BIBLIOTECA",
  description: `Las ${GAMES.length} máquinas del vault, listas para jugar.`,
};

export default function Home() {
  return (
    <main className="flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(22px,4vw,44px)] pb-22.5">
      <section className="mx-auto w-full max-w-310 animate-av-fade">
        <div className="pt-[clamp(14px,4vw,42px)] pb-[clamp(24px,4vw,40px)] text-center">
          <h1 className="font-display text-av-hero leading-[1.24] tracking-av-wider text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.9),0_0_42px_rgba(0,245,255,0.45)] animate-av-flicker">
            ARCADE
            <br />
            <span className="text-av-magenta [text-shadow:0_0_12px_rgba(255,0,110,0.9),0_0_44px_rgba(255,0,110,0.5)]">
              VAULT
            </span>
          </h1>
          <p className="mt-5.5 font-display text-av-label tracking-av-wider text-av-yellow [text-shadow:0_0_14px_rgba(245,255,0,0.5)] animate-av-caret">
            INSERTA UNA MONEDA PARA JUGAR
          </p>
        </div>

        <LibraryBrowser />
      </section>
    </main>
  );
}
