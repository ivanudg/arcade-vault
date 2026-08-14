/**
 * Pantalla de juego. Puerto de references/templates/jugar.dc.html.
 *
 * El HUD, el gabinete, el D-pad y los superpuestos de carga y fin de partida
 * viven todos en `PlayCabinet`: esta ruta sólo resuelve la máquina.
 */

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { PlayCabinet } from "@/components/play-cabinet";
import { GAMES, getGame } from "@/lib/games";

/** Sólo existe una ruta por máquina: cualquier otra es 404 sin ejecutar código. */
export const dynamicParams = false;

/**
 * El pellizco se bloquea sólo aquí, no en `app/layout.tsx`: es una ayuda de
 * accesibilidad real en las pantallas de texto y en las tablas del salón, y en
 * un tablero de juego sólo estorba. Sobre iOS 10 y posteriores Safari ignora
 * `maximum-scale` y `user-scalable`; lo que sí se corta ahí es el doble toque
 * y el arrastre, que es lo que molesta jugando.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Pedirlo obliga a rellenar con env(safe-area-inset-*): sin eso, el mando
  // se mete debajo del indicador de inicio.
  viewportFit: "cover",
};

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
    // El margen seguro se suma al relleno de siempre, no lo sustituye: en
    // Android y en escritorio `env(safe-area-inset-*)` vale 0 y la pantalla
    // queda exactamente como estaba.
    // Con el dedo la pantalla de juego es la ventana entera menos la cabecera,
    // y no se desplaza: lo que no quepa se recorta. Los 2rem de abajo son aire
    // de escritorio; en un teléfono sólo queda el margen seguro.
    // Eran 5rem, y en una pantalla que ya no se desplaza ese aire no se ve: lo
    // paga el tablero, porque entra entero en el presupuesto `--av-chrome` de
    // `PlayCabinet`. Recortarlo a 2rem son 48px que vuelven al juego, y por eso
    // los dos números van juntos: si esto cambia, se vuelve a medir aquél.
    // Y con el dedo el `flex-1` se apaga, que si no el alto de al lado no vale
    // nada: `body` sólo declara `min-h-full` sobre un `html` de altura
    // automática, así que la cadena llega aquí indefinida, `flex-basis: 0%` se
    // resuelve por contenido y el crecer gana al `height`. En vertical no se
    // notaba —el tablero lo acota su `max-w`, que lee `100svh` directamente—,
    // pero en horizontal el marco se queda sin nada contra lo que medir su
    // `h-full`, el canvas toma su tamaño natural y la página se desplaza casi
    // mil píxeles. Con `flex-none` manda la altura declarada y la cadena se
    // cierra. En escritorio no cambia nada: ahí sigue mandando `flex-1`.
    <main className="flex-1 pt-[clamp(18px,3vw,34px)] pr-[calc(clamp(14px,3vw,30px)+env(safe-area-inset-right))] pb-[calc(2rem+env(safe-area-inset-bottom))] pl-[calc(clamp(14px,3vw,30px)+env(safe-area-inset-left))] handheld:h-[calc(100svh-var(--av-play-header))] handheld:flex-none handheld:overflow-hidden handheld:pt-2.5 handheld:pr-[calc(6px+env(safe-area-inset-right))] handheld:pb-[env(safe-area-inset-bottom)] handheld:pl-[calc(6px+env(safe-area-inset-left))]">
      <PlayCabinet game={game} />
    </main>
  );
}
