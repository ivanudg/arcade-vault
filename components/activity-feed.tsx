"use client";

/**
 * Últimas marcas de todo el vault. Puerto de `.activity-card` / `.ticker` de
 * references/templates/home-about/, con los datos reales de `lib/scores.ts`
 * en lugar de las filas inventadas del prototipo.
 *
 * Dos diferencias con el template, decididas en SPEC 02:
 * - La última columna es la fecha `dd/mm/aa`, no un «hace 2 min»: no hay marca
 *   de tiempo real y fingirla sería mentir en la única columna verificable.
 * - El nombre se pinta con el acento de la máquina donde se logró la marca,
 *   así la columna de color dice algo en vez de alternar por alternar.
 *
 * Arranca con las semillas —lo único que puede pintar el servidor— y pasa a
 * las marcas reales tras montar, que es cuando existe `localStorage`.
 */

import { useEffect, useState } from "react";
import { getGame } from "@/lib/games";
import { formatScore, recentScores, seedRecentScores } from "@/lib/scores";

const LIMIT = 7;

export function ActivityFeed() {
  const [rows, setRows] = useState(() => seedRecentScores(LIMIT));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras hidratar
  useEffect(() => setRows(recentScores(LIMIT)), []);

  return (
    <section className="border border-av-line bg-av-panel">
      <header className="border-b border-av-line px-4 py-3.5">
        <h3 className="font-display text-[10px] tracking-widest text-av-cyan [text-shadow:0_0_8px_rgba(0,245,255,0.5)]">
          ▸ ULTIMAS PUNTUACIONES
        </h3>
      </header>

      <div className="py-1.5">
        {rows.map((row, i) => {
          const game = getGame(row.game);
          return (
            <div
              key={`${row.game}-${row.name}-${row.score}`}
              style={
                {
                  "--av-glow": game?.glow ?? "var(--av-text-bright)",
                  "--av-delay": `${(i * 0.055).toFixed(2)}s`,
                } as React.CSSProperties
              }
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-white/5 px-4.5 py-3 last:border-b-0 animate-av-row [animation-delay:var(--av-delay)] motion-reduce:delay-0 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] ${
                row.mine ? "bg-av-cyan/6" : ""
              }`}
            >
              <span className="truncate font-display text-[10px] tracking-av text-(--av-glow)">
                {row.name}
              </span>
              <span className="order-3 truncate text-[12px] text-av-text-dim sm:order-none">
                ▸ {game?.title ?? row.game}
              </span>
              <span className="text-right font-display text-[11px] text-av-yellow [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                +{formatScore(row.score)}
              </span>
              <span className="order-4 text-right text-[11px] tracking-av text-av-text-faint sm:order-none">
                {row.date}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
