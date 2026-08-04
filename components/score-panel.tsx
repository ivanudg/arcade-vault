"use client";

/**
 * Panel lateral de mejores puntuaciones de la ficha de máquina.
 * Puerto del `<aside>` de references/templates/detalle.dc.html.
 *
 * Las filas entran escalonadas con `av-row`, con 55 ms de retardo entre una y
 * la siguiente. Las tres primeras llevan medalla; las guardadas en este
 * dispositivo se resaltan con fondo cian.
 *
 * La tabla llega resuelta del servidor. Lo único que se resuelve aquí es de
 * quién es cada marca, que es lo único que el servidor no puede saber.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScoreboardUnavailable } from "@/components/scoreboard-unavailable";
import type { GameId } from "@/lib/games";
import { formatScore, type BoardRow } from "@/lib/scores";
import { deviceId } from "@/lib/storage";

/** Oro, plata y bronce. La plata no está en la paleta: es exclusiva del podio. */
const MEDALS = ["#f5ff00", "#d8dee9", "#ff9d4d"];
const NO_MEDAL = "#4a5160";

export function ScorePanel({
  id,
  rows: served,
}: {
  id: GameId;
  /** La tabla de esta máquina. Vacía si la base de datos no contestó. */
  rows: BoardRow[];
}) {
  const [device, setDevice] = useState<string>();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras hidratar
  useEffect(() => setDevice(deviceId()), []);

  const rows = served.map((r) => ({
    ...r,
    mine: device !== undefined && r.deviceId === device,
  }));

  return (
    <aside className="border border-av-magenta/30 bg-[rgba(13,15,22,0.88)] p-5.5 shadow-[0_0_32px_rgba(255,0,110,0.1)]">
      <h3 className="mb-4.5 font-display text-[11px] tracking-av text-av-magenta [text-shadow:0_0_12px_rgba(255,0,110,0.6)]">
        MEJORES PUNTUACIONES
      </h3>

      <div className="flex flex-col gap-0.5">
        {rows.length === 0 && <ScoreboardUnavailable />}

        {rows.map((r, i) => (
          <div
            key={`${r.name}-${r.score}-${i}`}
            style={
              {
                "--av-accent": i < 3 ? MEDALS[i] : NO_MEDAL,
                "--av-row": r.mine
                  ? "rgba(0,245,255,0.08)"
                  : i < 3
                    ? "rgba(245,255,0,0.04)"
                    : "transparent",
                "--av-delay": `${(i * 0.055).toFixed(2)}s`,
              } as React.CSSProperties
            }
            className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2.5 border-l-2 border-(--av-accent) bg-(--av-row) px-2 py-2.5 animate-av-row [animation-delay:var(--av-delay)] motion-reduce:[animation-delay:0ms]"
          >
            <span className="font-display text-[9px] text-(--av-accent)">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate text-[13px] tracking-av text-[#cfd5e2]">{r.name}</span>
            <span className="font-display text-[10px] text-av-yellow">{formatScore(r.score)}</span>
          </div>
        ))}
      </div>

      <Link
        href={`/salon?juego=${id}`}
        className="mt-4.5 block text-center text-[12px] tracking-av-wide text-av-text-dim hover:text-av-yellow"
      >
        Ver el Salón de la Fama completo &gt;
      </Link>
    </aside>
  );
}
