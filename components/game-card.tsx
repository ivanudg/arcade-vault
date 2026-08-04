"use client";

/**
 * Tarjeta de una máquina en la biblioteca. Puerto del `<article>` de
 * references/templates/biblioteca.dc.html.
 *
 * El color de acento no se conoce en tiempo de compilación, así que entra como
 * variables CSS (`--av-glow` y sus dos velos) y las clases lo consumen. El
 * `color` del artículo se pone al acento a propósito: la animación
 * `av-cabinet` dibuja su halo con `currentColor`.
 */

import Link from "next/link";
import { GamePreview } from "@/components/game-preview";
import { tint, type Game } from "@/lib/games";
import { formatScore } from "@/lib/scores";

export function GameCard({
  game,
  record,
}: {
  game: Game;
  /** Mejor marca de esta máquina. `undefined` si no hay marcas o no se pudo leer. */
  record?: number;
}) {
  // La cifra llega resuelta del servidor, así que se pinta ya en el HTML: ni
  // efecto, ni estado, ni parpadeo de valor al hidratar.
  const top = record === undefined ? "—" : formatScore(record);

  const playHref = game.playable ? `/jugar/${game.id}` : `/juego/${game.id}`;

  return (
    <article
      style={
        {
          "--av-glow": game.glow,
          "--av-tint": tint(game.glow, 0.16),
          "--av-edge": tint(game.glow, 0.3),
        } as React.CSSProperties
      }
      className="flex flex-col border border-(--av-edge) bg-[rgba(13,15,22,0.86)] text-(--av-glow) [transition:transform_.16s_steps(3),border-color_.16s_ease,filter_.2s_ease] hover:animate-av-cabinet hover:-translate-y-1.5 hover:border-current hover:brightness-112 hover:saturate-118"
    >
      <div className="relative h-39.5 overflow-hidden border-b border-(--av-edge) bg-av-void">
        <GamePreview id={game.id} className="size-full object-cover" />
        {/* Viñeta sobre la escena: hunde las esquinas del monitor. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_40%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.55)_100%)]" />
        <div className="absolute top-2.5 left-2.5 bg-(--av-glow) px-2 py-1.25 font-display text-[7px] tracking-av text-av-bg">
          {game.cat}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4.5">
        <h3 className="font-display text-[13px] leading-normal tracking-av text-av-text-bright">
          {game.title}
        </h3>
        <p className="text-[13px] leading-[1.55] text-pretty text-av-text-muted">{game.desc}</p>

        <div className="flex items-center justify-between gap-2.5 border border-av-yellow/22 bg-av-void px-2.5 py-2.25">
          <span className="font-display text-[7px] tracking-av text-av-text-dim">
            MEJOR PUNTUACION
          </span>
          <span className="font-display text-[10px] text-av-yellow [text-shadow:0_0_10px_rgba(245,255,0,0.55)]">
            {top}
          </span>
        </div>

        <div className="flex gap-2.5">
          <Link
            href={playHref}
            className="flex-1 border border-(--av-glow) px-2.5 py-3.25 text-center font-display text-[9px] tracking-av text-(--av-glow) hover:bg-(--av-tint) hover:text-white hover:shadow-[0_0_22px_var(--av-tint),inset_0_0_18px_var(--av-tint)]"
          >
            {game.playable ? "JUGAR" : "PRONTO"}
          </Link>
          <Link
            href={`/juego/${game.id}`}
            className="border border-white/14 px-3 py-3.25 font-display text-[9px] text-av-text-dim hover:border-av-yellow/50 hover:text-av-yellow"
          >
            INFO
          </Link>
        </div>
      </div>
    </article>
  );
}
