/**
 * Ficha de máquina. Puerto de references/templates/detalle.dc.html.
 *
 * Server Component: el catálogo es fijo, así que las 8 fichas se prerenderizan
 * en build. Sólo la preview y el panel de puntuaciones bajan a cliente.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GamePreview } from "@/components/game-preview";
import { ScorePanel } from "@/components/score-panel";
import { GAMES, getGame, tint } from "@/lib/games";
import { board } from "@/lib/leaderboard";
import { formatScore } from "@/lib/scores";

/** Sólo existen estas ocho rutas: cualquier otra es 404 sin ejecutar código. */
export const dynamicParams = false;

/**
 * La ficha lee el marcador, así que se renderiza en cada visita.
 *
 * Sin esto la ruta acabaría siendo dinámica igual —el cliente de Supabase mira
 * las cookies—, pero por la vía de intentar prerenderizarla y abortar. Dicho a
 * las claras se ahorra ese intento y queda escrito por qué. Caché, la que
 * traiga su propia spec.
 */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/juego/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return {};
  return { title: game.title, description: game.desc };
}

export default async function GamePage({ params }: PageProps<"/juego/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  // Un id inventado responde 404 en lugar de servir otra máquina, a diferencia
  // del `game()` del prototipo, que caía en la primera del catálogo.
  if (!game) notFound();

  // Una sola consulta: el récord del rótulo es la primera fila de la tabla, así
  // que no pueden discrepar.
  const rows = await board(game.id);
  const record = rows[0] ? formatScore(rows[0].score) : "—";

  return (
    <main className="flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(22px,4vw,44px)] pb-22.5">
      <section
        style={
          {
            "--av-glow": game.glow,
            "--av-edge": tint(game.glow, 0.32),
            "--av-halo": tint(game.glow, 0.65),
          } as React.CSSProperties
        }
        className="mx-auto w-full max-w-310 animate-av-fade"
      >
        <Link
          href="/"
          className="mb-6.5 inline-block border border-av-cyan/45 px-3.5 py-2.75 font-display text-[9px] tracking-av text-av-cyan hover:bg-av-cyan/14 hover:text-white"
        >
          &lt; VOLVER AL VAULT
        </Link>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-start gap-6.5">
          <div className="flex flex-col gap-5">
            <div className="relative h-60 overflow-hidden border border-(--av-edge) bg-av-void">
              <GamePreview
                id={game.id}
                width={560}
                height={360}
                className="size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_45%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.6)_100%)]" />
            </div>

            <h2 className="font-display text-av-section leading-[1.35] tracking-av text-(--av-glow) [text-shadow:0_0_16px_var(--av-halo)]">
              {game.title}
            </h2>

            <div className="flex flex-wrap gap-2.5 font-display text-[8px] tracking-av text-av-text-dim">
              <span className="border border-white/14 px-2.25 py-1.75">{game.cat}</span>
              <span className="border border-white/14 px-2.25 py-1.75">1 JUGADOR</span>
              <span className="border border-av-yellow/30 px-2.25 py-1.75 text-av-yellow">
                RECORD {record}
              </span>
            </div>

            <p className="max-w-[56ch] text-[15px] leading-[1.75] text-pretty text-av-text-soft">
              {game.long}
            </p>

            <div className="border border-dashed border-av-cyan/25 bg-[rgba(5,6,10,0.8)] p-3.5 text-[12px] leading-[1.7] text-av-text-dim">
              CONTROLES: {game.controls}
            </div>

            <div className="flex flex-wrap gap-3.5">
              {game.playable ? (
                <Link
                  href={`/jugar/${game.id}`}
                  className="bg-av-magenta px-6.5 py-4.5 font-display text-[12px] tracking-av-wider text-av-bg animate-av-pulse hover:bg-av-yellow hover:text-av-bg"
                >
                  JUGAR AHORA
                </Link>
              ) : (
                <span className="border border-white/10 bg-av-panel-raised px-6.5 py-4.5 font-display text-[12px] tracking-av-wider text-av-line-strong">
                  PRONTO
                </span>
              )}
              <Link
                href="/"
                className="border border-av-cyan px-6.5 py-4.5 font-display text-[11px] tracking-av text-av-cyan hover:bg-av-cyan/12 hover:text-white"
              >
                VOLVER AL VAULT
              </Link>
            </div>
          </div>

          <ScorePanel id={game.id} rows={rows} />
        </div>
      </section>
    </main>
  );
}
