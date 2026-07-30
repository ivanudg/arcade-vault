/**
 * Pantalla 404. La única que no existe en references/templates/, así que se
 * compone con piezas que ya usan las otras: el chip con borde de la ficha, un
 * rótulo de neón con `av-flicker` —el tubo de una máquina que no arranca— y el
 * mismo botón cian de VOLVER AL VAULT.
 *
 * El acento es magenta porque en este producto magenta es el color de aviso:
 * es el que usa "NO HAY JUEGOS PARA ESA BUSQUEDA" en la biblioteca.
 */

import Link from "next/link";
import { GAMES } from "@/lib/games";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-[clamp(14px,3vw,40px)] py-[clamp(44px,10vw,110px)]">
      <section className="flex max-w-[52ch] flex-col items-center gap-5 text-center animate-av-fade">
        <span className="border border-av-amber/30 px-2.25 py-1.75 font-display text-[8px] tracking-av text-av-amber">
          ERROR 404
        </span>

        <h1 className="font-display text-av-section leading-[1.35] tracking-av text-av-magenta av-glow-magenta animate-av-flicker">
          MAQUINA NO ENCONTRADA
        </h1>

        <p className="text-[15px] leading-[1.75] text-pretty text-av-text-soft">
          Esa dirección no corresponde a ninguna de las {GAMES.length} máquinas
          del vault. Vuelve a la biblioteca para ver el catálogo completo.
        </p>

        <Link
          href="/"
          className="mt-1 border border-av-cyan px-6.5 py-4.5 font-display text-[11px] tracking-av text-av-cyan hover:bg-av-cyan/12 hover:text-white"
        >
          &lt; VOLVER AL VAULT
        </Link>
      </section>
    </main>
  );
}
