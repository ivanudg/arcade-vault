/**
 * Ficha reducida del rail de la portada. Puerto de `MiniCard` y `.mini-card`
 * de references/templates/home-about/.
 *
 * Es la tarjeta de la biblioteca sin su maquinaria: portada cuadrada, título y
 * categoría, y toda la tarjeta es el enlace a la ficha. No lee puntuaciones,
 * así que se queda en el servidor; el único trozo de cliente es el lienzo de
 * `GamePreview`.
 *
 * El acento de la máquina entra como variable CSS, igual que en `GameCard`:
 * no se conoce en tiempo de compilación y no puede salir de una clase estática.
 */

import Link from "next/link";
import { GamePreview } from "@/components/game-preview";
import { type Game, tint } from "@/lib/games";

export function MiniGameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/juego/${game.id}`}
      style={
        {
          "--av-glow": game.glow,
          "--av-edge": tint(game.glow, 0.3),
        } as React.CSSProperties
      }
      className="block border border-av-line bg-av-panel text-(--av-glow) transition duration-200 hover:-translate-y-1 hover:border-current"
    >
      <div className="relative aspect-square overflow-hidden border-b border-(--av-edge) bg-av-void">
        <GamePreview
          id={game.id}
          width={300}
          height={300}
          className="size-full object-cover"
        />
        {/* Viñeta sobre la escena, la misma que hunde las esquinas en la biblioteca. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_40%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      <div className="px-3 py-2.5">
        <h3 className="font-display text-[10px] leading-normal tracking-av text-av-text-bright">
          {game.title}
        </h3>
        <p className="mt-1 text-[10px] tracking-[0.14em] text-av-text-faint">
          {game.cat}
        </p>
      </div>
    </Link>
  );
}
