"use client";

/**
 * Gabinete de la pantalla de juego. Puerto de references/templates/jugar.dc.html.
 *
 * No hay motor: el canvas muestra la escena de `drawPreview()` congelada y el
 * HUD lee las cifras fijas de `DEMO_RUN`. El D-pad y FUEGO sólo responden
 * visualmente; PAUSA sí tiene efecto, porque su superpuesto es interfaz de
 * verdad. Los superpuestos de carga y fin de partida llegan en el paso 18.
 */

import { useState } from "react";
import { GamePreview } from "@/components/game-preview";
import { DEMO_RUN } from "@/lib/demo-run";
import type { Game } from "@/lib/games";
import { formatScore } from "@/lib/scores";
import { useSession } from "@/lib/session";

/** Las cinco teclas del mando, en el orden del prototipo. */
const PAD = ["←", "↑", "↓", "→", "FUEGO"];

export function PlayCabinet({ game }: { game: Game }) {
  const { user, ready } = useSession();
  const [paused, setPaused] = useState(false);

  const run = DEMO_RUN[game.id];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border border-av-cyan/30 bg-[rgba(13,15,22,0.9)] px-4 py-3.5">
        <div className="flex flex-wrap gap-5.5 font-display text-[9px] tracking-av">
          <span className="text-av-text-dim">
            PUNTUACION{" "}
            <span className="text-av-cyan [text-shadow:0_0_10px_rgba(0,245,255,0.6)]">
              {formatScore(run.score)}
            </span>
          </span>
          <span className="text-av-text-dim">
            VIDAS{" "}
            <span className="text-av-magenta [text-shadow:0_0_10px_rgba(255,0,110,0.6)]">
              {run.lives}
            </span>
          </span>
          <span className="text-av-text-dim">
            NIVEL{" "}
            <span className="text-av-yellow [text-shadow:0_0_10px_rgba(245,255,0,0.6)]">
              {run.level}
            </span>
          </span>
          <span className="text-av-text-dim">
            JUGADOR{" "}
            <span className="text-av-text-bright">
              {/* Hasta leer `localStorage` se muestra INVITADO, que es también
                  el valor definitivo de quien no tiene sesión. */}
              {ready && user ? user.name : "INVITADO"}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="cursor-pointer border border-av-yellow/45 bg-transparent px-3.5 py-2.75 font-display text-[9px] text-av-yellow active:scale-94 hover:bg-av-yellow/16 hover:text-white"
        >
          {paused ? "SEGUIR" : "PAUSA"}
        </button>
      </div>

      <div className="mx-auto mt-6.5 rounded-[34px] border border-av-cyan/22 bg-[linear-gradient(#15171f,#0b0c12)] p-5.5 shadow-[0_0_46px_rgba(0,245,255,0.12),inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="relative overflow-hidden rounded-[22px] bg-av-void shadow-[inset_0_0_60px_rgba(0,0,0,0.9),inset_0_0_12px_rgba(0,245,255,0.16)]">
          <GamePreview
            id={game.id}
            width={480}
            height={480}
            className="h-auto w-full"
          />

          {/* Viñeta del tubo y barrido de brillo que recorre la pantalla. */}
          <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(115%_115%_at_50%_50%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.72)_100%)]" />
          <div className="pointer-events-none absolute inset-0 h-[34%] bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,0.045)_55%,rgba(255,255,255,0)_100%)] animate-av-sweep" />

          {paused && (
            <div className="absolute inset-0 grid place-items-center bg-[rgba(5,6,10,0.78)]">
              <span className="font-display text-[clamp(14px,3vw,22px)] tracking-av-wider text-av-yellow [text-shadow:0_0_18px_rgba(245,255,0,0.6)]">
                EN PAUSA
              </span>
            </div>
          )}
        </div>

        <div className="mt-4.5 grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-2.5">
          {PAD.map((label) => (
            <button
              key={label}
              type="button"
              aria-label={label === "FUEGO" ? "Fuego" : `Mover ${label}`}
              className="cursor-pointer border border-av-cyan/30 bg-av-panel px-1.5 py-3.75 font-display text-[10px] text-av-cyan active:bg-av-cyan active:text-av-bg"
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-3.5 text-center text-[12px] tracking-av text-av-text-faint">
          {game.controls}
        </p>
      </div>
    </>
  );
}
