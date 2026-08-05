"use client";

/**
 * Tabla del salón de la fama: pestaña por máquina y sus diez mejores marcas.
 * Puerto de references/templates/salon.dc.html.
 *
 * La pestaña inicial llega por prop desde la ruta (`?juego=`); a partir de ahí
 * es estado de cliente y la URL no cambia, igual que en el prototipo.
 *
 * Las tablas llegan resueltas del servidor, así que cambiar de pestaña no
 * consulta nada. Lo único que este componente resuelve por su cuenta es de quién
 * es cada marca: el servidor no puede leer `localStorage`.
 *
 * Tres estados, no dos: `tables` a `null` es que no se pudo preguntar, y una
 * pestaña sin filas dentro de un mapa que sí llegó es una máquina sin estrenar.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScoreboardEmpty } from "@/components/scoreboard-empty";
import { ScoreboardUnavailable } from "@/components/scoreboard-unavailable";
import { GAMES, getGame, tint, type GameId } from "@/lib/games";
import { formatScore, type BoardRow } from "@/lib/scores";
import { deviceId } from "@/lib/storage";

/** Oro, plata y bronce. La plata no está en la paleta: es exclusiva del podio. */
const MEDALS = ["#f5ff00", "#d8dee9", "#ff9d4d"];
const NO_MEDAL = "#4a5160";

const COLUMNS = "grid-cols-[62px_minmax(0,1fr)_108px_96px]";

export function HallOfFame({
  initialTab,
  tables,
}: {
  initialTab: GameId;
  /** Las tablas ya resueltas, o `null` si la base de datos no contestó. */
  tables: Partial<Record<GameId, BoardRow[]>> | null;
}) {
  const [tab, setTab] = useState<GameId>(initialTab);
  const [device, setDevice] = useState<string>();

  // El único efecto que queda: de quién es cada marca. Repinta un color, no
  // vuelve a pedir los datos.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras hidratar
  useEffect(() => setDevice(deviceId()), []);

  const unavailable = tables === null;
  const rows = (tables?.[tab] ?? []).map((r) => ({
    ...r,
    mine: device !== undefined && r.deviceId === device,
  }));

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

        {unavailable ? <ScoreboardUnavailable /> : rows.length === 0 && <ScoreboardEmpty />}

        {rows.map((r, i) => (
          <div
            key={`${r.name}-${r.score}-${i}`}
            style={
              {
                "--av-accent": i < 3 ? MEDALS[i] : NO_MEDAL,
                "--av-accent-halo": i < 3 ? tint(MEDALS[i], 0.6) : "rgba(0,0,0,0)",
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
              <span className="truncate text-[14px] tracking-av text-[#dbe1ee]">{r.name}</span>
              {r.mine && (
                <span className="flex-none bg-av-cyan px-1.75 py-1 font-display text-[7px] text-av-bg">
                  TU MEJOR MARCA
                </span>
              )}
            </span>
            <span className="text-right font-display text-[10px] text-av-yellow">
              {formatScore(r.score)}
            </span>
            <span className="text-right text-[12px] text-av-text-dim">{r.date}</span>
          </div>
        ))}
      </div>

      <div className="mt-5.5 flex flex-wrap items-center justify-between gap-3.5">
        <p className="max-w-[62ch] text-[12px] tracking-av text-av-line-strong">
          Puntuaciones compartidas en Supabase. Sin sesión todavía: cualquiera puede firmar con el
          nombre que quiera.
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
