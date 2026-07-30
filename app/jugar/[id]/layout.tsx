/**
 * Chrome de la pantalla de juego.
 *
 * Está fuera del grupo `(vault)` a propósito: así no hereda la cabecera general
 * ni el pie. El fondo y la sesión sí los hereda del layout raíz.
 *
 * El layout resuelve la máquina porque necesita su título para la cabecera; la
 * página vuelve a pedirla para el gabinete.
 */

import { notFound } from "next/navigation";
import { PlayHeader } from "@/components/play-header";
import { getGame } from "@/lib/games";

export default async function PlayLayout({
  children,
  params,
}: LayoutProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return (
    <>
      <PlayHeader game={game} />
      {children}
    </>
  );
}
