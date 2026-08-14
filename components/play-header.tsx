/**
 * Cabecera de la pantalla de juego. Puerto del `<header>` de
 * references/templates/jugar.dc.html.
 *
 * Más baja y más sobria que la general: marca, título de la máquina y una
 * salida. Sin navegación ni estado de sesión, para no competir con el gabinete.
 * Server Component: aquí nada es interactivo.
 */

import Link from "next/link";
import type { Game } from "@/lib/games";

export function PlayHeader({ game }: { game: Game }) {
  return (
    // Con el dedo la cabecera mide exactamente `--av-play-header`: es lo que
    // el `<main>` de la pantalla de juego le resta a la ventana para caber sin
    // desplazar la página. El relleno vertical sobra con la altura fija.
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3.5 border-b border-av-cyan/24 bg-[rgba(10,10,15,0.9)] px-[clamp(14px,3vw,40px)] py-3.5 handheld:h-(--av-play-header) handheld:py-0 handheld:pr-[calc(14px+env(safe-area-inset-right))] handheld:pl-[calc(14px+env(safe-area-inset-left))]">
      <Link
        href="/"
        className="font-display text-[clamp(10px,2vw,13px)] tracking-av text-av-cyan [text-shadow:0_0_8px_rgba(0,245,255,0.9)]"
      >
        ARCADE
        <span className="text-av-magenta [text-shadow:0_0_8px_rgba(255,0,110,0.9)]"> VAULT</span>
      </Link>

      {/* En horizontal de mano el alto es todo del tablero, y el título de la
          máquina es lo único de aquí que no hace falta: se acaba de leer en su
          ficha. ARCADE VAULT y SALIR se quedan. */}
      <span className="font-display text-[clamp(9px,1.8vw,12px)] tracking-av text-av-text-bright handheld-wide:hidden">
        {game.title}
      </span>

      {/* Salir devuelve a la ficha de la máquina, no a la biblioteca: es de
          donde se llega a jugar. Con el dedo no está aquí: desde SPEC 12 baja
          al centro del mando —donde llega el pulgar, y preguntando antes—, y
          esta cabecera se queda con la marca y el título. */}
      <Link
        href={`/juego/${game.id}`}
        className="shrink-0 border border-av-magenta/45 px-3.25 py-2.75 font-display text-[9px] tracking-av text-av-magenta hover:bg-av-magenta/16 hover:text-white handheld:hidden handheld-wide:py-2"
      >
        SALIR
      </Link>
    </header>
  );
}
