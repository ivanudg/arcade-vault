"use client";

/**
 * Buscador, filtros por categoría y rejilla de la biblioteca.
 *
 * El estado vive en el cliente y no en `searchParams`: un MVP visual no
 * necesita filtros compartibles por enlace, y así no hay una navegación por
 * cada pulsación. Puerto de la lógica de `renderVals()` en
 * references/templates/biblioteca.dc.html.
 */

import { useMemo, useState } from "react";
import { GameCard } from "@/components/game-card";
import type { Game, GameId } from "@/lib/games";

export function LibraryBrowser({
  games,
  records,
}: {
  /**
   * Las máquinas jugables, resueltas en el servidor. Desde SPEC 17 salen de
   * `public.games` y bajan por props: ningún componente consulta por su cuenta.
   */
  games: Game[];
  /** Mejor marca de cada máquina, resuelta en el servidor. Sólo va de paso. */
  records: Partial<Record<GameId, number>>;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("TODOS");

  /** 'TODOS' más las categorías que hay hoy, sin repetir y en orden de aparición. */
  const categories = useMemo(() => ["TODOS", ...new Set(games.map((g) => g.cat))], [games]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter(
      (g) =>
        (cat === "TODOS" || g.cat === cat) &&
        (!q ||
          g.title.toLowerCase().includes(q) ||
          g.desc.toLowerCase().includes(q) ||
          g.cat.toLowerCase().includes(q)),
    );
  }, [games, query, cat]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border border-av-cyan/22 bg-[rgba(13,15,22,0.7)] p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca un juego por nombre..."
          aria-label="Busca un juego por nombre"
          className="min-w-0 flex-[1_1_240px] border border-av-cyan/35 bg-av-void px-3.5 py-3 text-[14px] tracking-av text-av-text-bright outline-none focus:border-av-cyan focus:shadow-[0_0_18px_rgba(0,245,255,0.45)]"
        />

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = cat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                aria-pressed={on}
                className={`cursor-pointer border px-3 py-2.5 font-display text-[8px] tracking-av active:scale-94 ${
                  on
                    ? "border-av-cyan bg-av-cyan text-av-bg"
                    : "border-white/16 bg-transparent text-av-text-muted hover:border-av-yellow hover:text-av-yellow"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6.5 grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-5.5">
        {visible.map((g) => (
          <GameCard key={g.id} game={g} record={records[g.id]} />
        ))}
      </div>

      {visible.length === 0 && (
        <p
          role="status"
          className="mt-10 text-center font-display text-[11px] tracking-av text-av-magenta"
        >
          NO HAY JUEGOS PARA ESA BUSQUEDA
        </p>
      )}
    </>
  );
}
