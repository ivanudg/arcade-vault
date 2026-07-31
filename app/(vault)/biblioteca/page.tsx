/**
 * Biblioteca: el catálogo completo de máquinas.
 *
 * Puerto de references/templates/biblioteca.dc.html. Vivía en `/` hasta que la
 * portada ocupó esa ruta; lo único que cambió al mudarse es el encabezado: el
 * rótulo gigante `ARCADE / VAULT` lo pinta ahora el hero de la portada, y
 * repetirlo aquí lo hacía salir dos veces en dos pantallas seguidas.
 *
 * El encabezado y su línea de apoyo son estáticos, así que se quedan en el
 * servidor; sólo el buscador y la rejilla bajan a cliente.
 *
 * El ancho máximo va en el envoltorio interior y el relleno en el `<main>`:
 * las plantillas usan `box-sizing: content-box`, así que sus 1240px son de
 * contenido. Con el `border-box` de Tailwind, juntarlo todo en un elemento
 * restaría el relleno y la rejilla saldría 80px más estrecha.
 */

import type { Metadata } from "next";
import { LibraryBrowser } from "@/components/library-browser";
import { GAMES } from "@/lib/games";

export const metadata: Metadata = {
  title: "BIBLIOTECA",
  description: `Las ${GAMES.length} máquinas del vault, listas para jugar.`,
};

export default function LibraryPage() {
  return (
    <main className="flex-1 px-[clamp(14px,3vw,40px)] pt-[clamp(22px,4vw,44px)] pb-22.5">
      <section className="mx-auto w-full max-w-310 animate-av-fade">
        <div className="pt-[clamp(10px,3vw,28px)] pb-[clamp(24px,4vw,40px)] text-center">
          <h1 className="font-display text-av-section leading-[1.35] tracking-av-wider text-av-cyan [text-shadow:0_0_12px_rgba(0,245,255,0.85),0_0_38px_rgba(0,245,255,0.4)]">
            BIBLIOTECA
          </h1>
          <p className="mt-4.5 text-[14px] tracking-av text-av-text-dim">
            Las {GAMES.length} máquinas del vault, listas para jugar.
          </p>
        </div>

        <LibraryBrowser />
      </section>
    </main>
  );
}
