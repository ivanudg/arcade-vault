"use client";

/**
 * Tabla del salón de la fama: pestaña por máquina y sus diez mejores marcas.
 * Puerto de references/templates/salon.dc.html.
 *
 * La pestaña inicial llega por prop desde la ruta (`?juego=`); a partir de ahí
 * es estado de cliente y la URL no cambia, igual que en el prototipo.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES, getGame, tint, type GameId } from "@/lib/games";
import { board, formatScore, seedBoard } from "@/lib/scores";

/** Oro, plata y bronce. La plata no está en la paleta: es exclusiva del podio. */
const MEDALS = ["#f5ff00", "#d8dee9", "#ff9d4d"];
const NO_MEDAL = "#4a5160";

const COLUMNS = "grid-cols-[62px_minmax(0,1fr)_108px_96px]";

export function HallOfFame({ initialTab }: { initialTab: GameId }) {
  const [tab, setTab] = useState<GameId>(initialTab);
  const [rows, setRows] = useState(() => seedBoard(initialTab));

  // Semilla primero —lo que pinta el servidor— y tabla completa tras montar.
  useEffect(() => setRows(board(tab)), [tab]);

  const game = getGame(tab);
  const playHref = game?.playable ? `/jugar/${tab}` : `/juego/${tab}`;

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        {GAMES.map((g) => {
          const on = tab === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setTab(g.id)}
              aria-pressed={on}
              style={{ "--av-tab": g.glow } as React.CSSProperties}
              className={`cursor-pointer border px-3.25 py-2.75 font-display text-[8px] tracking-av active:scale-95 ${
                on
                  ? "border-(--av-tab) bg-(--av-tab) text-av-bg"
                  : "border-white/16 bg-transparent text-av-text-muted hover:border-av-yellow hover:text-av-yellow"
              }`}
            >
              {g.title}
            </button>
          );
        })}
      </div>

      <div className="mt-7 border border-av-cyan/22 bg-[rgba(13,15,22,0.88)]">
        <div
          className={`grid ${COLUMNS} gap-2.5 border-b border-av-cyan/22 bg-av-void px-4 py-3.5 font-display text-[8px] tracking-av text-av-cyan`}
        >
          <span>RANGO</span>
          <span>JUGADOR</span>
          <span className="text-right">PUNTOS</span>
          <span className="text-right">FECHA</span>
        </div>

        {rows.map((r, i) => (
          <div
            key={`${r.name}-${r.score}-${i}`}
            style={
              {
                "--av-accent": i < 3 ? MEDALS[i] : NO_MEDAL,
                "--av-accent-halo":
                  i < 3 ? tint(MEDALS[i], 0.6) : "rgba(0,0,0,0)",
                "--av-row": r.mine
                  ? "rgba(0,245,255,0.08)"
                  : i < 3
                    ? "rgba(245,255,0,0.04)"
                    : "transparent",
                "--av-delay": `${(i * 0.055).toFixed(2)}s`,
              } as React.CSSProperties
            }
            className={`grid ${COLUMNS} items-center gap-2.5 border-b border-white/5 bg-(--av-row) px-4 py-3.5 animate-av-row [animation-delay:var(--av-delay)] motion-reduce:[animation-delay:0ms]`}
          >
            <span className="font-display text-[11px] text-(--av-accent) [text-shadow:0_0_10px_var(--av-accent-halo)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="truncate text-[14px] tracking-av text-[#dbe1ee]">
                {r.name}
              </span>
              {r.mine && (
                <span className="flex-none bg-av-cyan px-1.75 py-1 font-display text-[7px] text-av-bg">
                  TU MEJOR MARCA
                </span>
              )}
            </span>
            <span className="text-right font-display text-[10px] text-av-yellow">
              {formatScore(r.score)}
            </span>
            <span className="text-right text-[12px] text-av-text-dim">
              {r.date}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5.5 flex flex-wrap items-center justify-between gap-3.5">
        <p className="max-w-[62ch] text-[12px] tracking-av text-av-line-strong">
          Puntuaciones locales (localStorage). Punto de conexión previsto: GET
          /api/scores/:juego — REST o Supabase para usuarios autenticados.
        </p>
        <Link
          href={playHref}
          className="border border-av-magenta/50 px-4.5 py-3.5 font-display text-[9px] tracking-av text-av-magenta hover:bg-av-magenta/16 hover:text-white"
        >
          BATIR ESTE RECORD
        </Link>
      </div>
    </>
  );
}
