/**
 * Pantalla de juego. Puerto de references/templates/jugar.dc.html.
 *
 * Marcador del paso 16: sólo el contenedor. El HUD, el gabinete y los
 * superpuestos llegan en los pasos 17 y 18.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES, getGame } from "@/lib/games";

/** Sólo existen estas ocho rutas: cualquier otra es 404 sin ejecutar código. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/jugar/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return {};
  return { title: `JUGAR · ${game.title} · Arcade Vault`, description: game.desc };
}

export default async function PlayPage({ params }: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return (
    <main className="flex-1 px-[clamp(14px,3vw,30px)] pt-[clamp(18px,3vw,34px)] pb-20">
      <section className="mx-auto w-full max-w-195 animate-av-fade">
        <p className="font-display text-[9px] tracking-av text-av-text-dim">
          GABINETE DE {game.title} — PENDIENTE DEL PASO 17
        </p>
      </section>
    </main>
  );
}
