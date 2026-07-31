"use client";

/**
 * Los cinco mejores jugadores del vault. Puerto de `.top-list` / `.top-row` de
 * references/templates/home-about/.
 *
 * El rótulo dice `· GLOBAL` y no `· HOY` porque no hay noción de día en el
 * modelo: el ranking sale de la mejor marca de cada nombre en cualquier
 * máquina, que es lo único que las puntuaciones permiten afirmar.
 *
 * La barra es proporcional a la marca del primero, no un decorado de anchos
 * fijos: si dos jugadores empatan, sus barras miden lo mismo.
 *
 * Arranca con las semillas —lo único que puede pintar el servidor— y pasa al
 * ranking real tras montar, que es cuando existe `localStorage`.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getGame, tint } from "@/lib/games";
import { formatScore, seedTopPlayers, topPlayers } from "@/lib/scores";

const LIMIT = 5;

/** Oro, plata y bronce, los mismos tres del salón. */
const MEDALS = ["#f5ff00", "#d8dee9", "#ff9d4d"];
const NO_MEDAL = "#4a5160";

/** Ancho del carril del rango: la barra empieza donde acaba. */
const RANK_COLUMN = "38px";

export function TopPlayers() {
  const [rows, setRows] = useState(() => seedTopPlayers(LIMIT));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras hidratar
  useEffect(() => setRows(topPlayers(LIMIT)), []);

  const best = rows[0]?.score ?? 0;

  return (
    <section className="flex flex-col border border-av-line bg-av-panel">
      <header className="flex items-center justify-between gap-2.5 border-b border-av-line px-4 py-3.5">
        <h3 className="min-w-0 truncate font-display text-[10px] tracking-widest text-av-magenta [text-shadow:0_0_8px_rgba(255,0,110,0.5)]">
          &gt; TOP JUGADORES · GLOBAL
        </h3>
        <Link
          href="/salon"
          className="flex-none border border-av-line px-2.5 py-1.75 font-display text-[9px] tracking-av text-av-text-dim hover:border-av-magenta hover:text-av-magenta"
        >
          VER SALON →
        </Link>
      </header>

      <div className="flex flex-col gap-2.5 px-4.5 py-4">
        {rows.map((row, i) => {
          const accent = i < 3 ? MEDALS[i] : NO_MEDAL;
          const share = best > 0 ? (row.score / best) * 100 : 0;
          return (
            <div
              key={row.name}
              style={
                {
                  "--av-accent": accent,
                  "--av-veil": tint(accent, i < 3 ? 0.14 : 0.08),
                } as React.CSSProperties
              }
              className="relative grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2.5 py-2"
              title={`${row.name} · ${getGame(row.game)?.title ?? row.game}`}
            >
              <span
                aria-hidden="true"
                style={{
                  width: `calc((100% - ${RANK_COLUMN}) * ${share.toFixed(2)} / 100)`,
                }}
                className="pointer-events-none absolute inset-y-0 left-9.5 bg-linear-to-r from-(--av-veil) to-transparent"
              />
              <span className="relative font-display text-[10px] text-(--av-accent)">
                #{String(row.rank).padStart(2, "0")}
              </span>
              <span className="relative truncate font-display text-[11px] tracking-av text-av-text">
                {row.name}
              </span>
              <span className="relative font-display text-[11px] text-(--av-accent)">
                {formatScore(row.score)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
