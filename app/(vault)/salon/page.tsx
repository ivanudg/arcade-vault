/**
 * Salón de la fama. Puerto de references/templates/salon.dc.html.
 *
 * `?juego=` se conserva sólo aquí, y únicamente para elegir la pestaña de
 * partida: no identifica el recurso. El servidor lo lee y lo valida; a partir
 * de ahí las pestañas son estado de cliente.
 *
 * Como en la biblioteca, el ancho máximo va dentro y el relleno fuera: las
 * plantillas miden sus 1100px en `content-box`.
 */

import type { Metadata } from "next";
import { CatalogEmpty } from "@/components/catalog-empty";
import { CatalogUnavailable } from "@/components/catalog-unavailable";
import { HallOfFame } from "@/components/hall-of-fame";
import { catalog } from "@/lib/catalog";
import { boards } from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "SALON DE LA FAMA",
  description: "Las diez marcas más altas de cada máquina del vault.",
};

export default async function HallPage({ searchParams }: PageProps<"/salon">) {
  const { juego } = await searchParams;

  // Las dos lecturas a la vez: ni el catálogo depende del marcador ni al revés.
  //
  // De `boards()` salen todas las tablas de una sola consulta, así que cambiar
  // de pestaña no vuelve a preguntar. Baja tal cual, con su `null`: la
  // diferencia entre no poder preguntar y no tener marcas la pinta
  // `HallOfFame`, que es quien sabe qué pestaña se está viendo.
  const [tables, games] = await Promise.all([boards(), catalog()]);

  // El salón conserva la pestaña de una máquina retirada, así que aquí no se
  // filtra `playable`: las marcas ya firmadas siguen siendo verdad, y
  // esconderlas al retirar la máquina sería reescribir la historia del
  // marcador.
  if (games === null || games.length === 0) {
    return (
      <main className="flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(22px,4vw,44px)] pb-22.5">
        <section className="mx-auto w-full max-w-275 animate-av-fade">
          <h2 className="text-center font-display text-[clamp(18px,4.6vw,40px)] leading-[1.35] tracking-av-wider text-av-yellow [text-shadow:0_0_14px_rgba(245,255,0,0.7),0_0_40px_rgba(245,255,0,0.3)]">
            SALON DE LA FAMA
          </h2>
          {games === null ? <CatalogUnavailable /> : <CatalogEmpty />}
        </section>
      </main>
    );
  }

  // Un `?juego=` inventado no es un 404: abre en la primera máquina, que desde
  // SPEC 17 es la de menor `sort_order` y no un `"asteroids"` escrito a mano.
  const requested = typeof juego === "string" ? games.find((g) => g.id === juego) : undefined;
  const initialTab = requested?.id ?? games[0].id;

  return (
    <main className="flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(22px,4vw,44px)] pb-22.5">
      <section className="mx-auto w-full max-w-275 animate-av-fade">
        <h2 className="text-center font-display text-[clamp(18px,4.6vw,40px)] leading-[1.35] tracking-av-wider text-av-yellow [text-shadow:0_0_14px_rgba(245,255,0,0.7),0_0_40px_rgba(245,255,0,0.3)]">
          SALON DE LA FAMA
        </h2>
        <p className="mt-4.5 mb-7.5 text-center text-[14px] tracking-av text-av-text-dim">
          Las diez marcas más altas de cada máquina del vault.
        </p>

        <HallOfFame initialTab={initialTab} games={games} tables={tables} />
      </section>
    </main>
  );
}
