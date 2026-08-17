/**
 * Chrome de la pantalla de juego.
 *
 * Está fuera del grupo `(vault)` a propósito: así no hereda la cabecera general
 * ni el pie. El fondo y la sesión sí los hereda del layout raíz.
 *
 * El layout resuelve la máquina porque necesita su título para la cabecera; la
 * página vuelve a pedirla para el gabinete, y `generateMetadata` una tercera
 * vez. Las tres llaman a la misma `game()`, que está envuelta en `cache()` de
 * React: son una consulta y no tres.
 *
 * Y es el layout quien corta. Sin catálogo no puede pintar `PlayHeader` —no
 * sabe cómo se llama la máquina—, así que avisa y no monta `children`: el
 * gabinete no llega a arrancar un motor que la pantalla no sabe describir.
 */

import { notFound } from "next/navigation";
import { CatalogUnavailable } from "@/components/catalog-unavailable";
import { PlayHeader } from "@/components/play-header";
import { game as findGame } from "@/lib/catalog";

export default async function PlayLayout({ children, params }: LayoutProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = await findGame(id);

  // `null` es que no se pudo preguntar, y eso no es un 404.
  if (game === null) {
    return (
      <main className="flex flex-1 items-center justify-center px-[clamp(14px,3vw,40px)]">
        <CatalogUnavailable />
      </main>
    );
  }

  // Sin fila, o retirada: `playable = false` es la vía de retirada sin
  // desplegar, y una máquina retirada no se juega.
  if (game === undefined || !game.playable) notFound();

  return (
    <>
      <PlayHeader game={game} />
      {children}
    </>
  );
}
