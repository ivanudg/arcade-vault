/**
 * Pantalla de juego. Puerto de references/templates/jugar.dc.html.
 *
 * El HUD, el gabinete, el D-pad y los superpuestos de carga y fin de partida
 * viven todos en `PlayCabinet`: esta ruta sólo resuelve la máquina.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayCabinet } from "@/components/play-cabinet";
import { GAMES, getGame } from "@/lib/games";

/** Sólo existe una ruta por máquina: cualquier otra es 404 sin ejecutar código. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/jugar/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return {};
  return { title: `JUGAR · ${game.title}`, description: game.desc };
}

export default async function PlayPage({ params }: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return (
    <main className="flex-1 px-[clamp(14px,3vw,30px)] pt-[clamp(18px,3vw,34px)] pb-20">
      <PlayCabinet game={game} />
    </main>
  );
}
