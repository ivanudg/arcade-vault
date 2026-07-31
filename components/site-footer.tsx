"use client";

/**
 * Pie compartido. Cada pantalla remata con su propia línea, copiada literal de
 * las plantillas; el texto entra por prop y, si no se pasa, se deduce de la
 * ruta para que el layout pueda montar el pie una sola vez.
 */

import { usePathname } from "next/navigation";
import { getGame } from "@/lib/games";

/** El remate del catálogo, que ya no vive en `/`. */
const LIBRARY_TEXT = "ARCADE VAULT · 8 MÁQUINAS · INSERTA UNA MONEDA";

/**
 * Un remate por pantalla. Los cuatro últimos vienen literales de
 * references/templates/; el de la portada es nuevo y repite la promesa de su
 * hero, que es lo que esa pantalla afirma.
 */
const BY_SECTION: ReadonlyArray<[test: (path: string) => boolean, text: string]> =
  [
    [(p) => p === "/", "ARCADE VAULT · SIN DESCARGAS · SIN COSTO"],
    [(p) => p.startsWith("/biblioteca"), LIBRARY_TEXT],
    [(p) => p.startsWith("/salon"), "ARCADE VAULT · SALÓN DE LA FAMA"],
    [(p) => p.startsWith("/cuenta"), "ARCADE VAULT · ACCESO DE JUGADORES"],
    // Sólo si la máquina existe: en el 404 de `/juego/inventado` este pie
    // anunciaría una ficha que no se está mostrando.
    [
      (p) => {
        const match = /^\/juego\/([^/]+)$/.exec(p);
        return match !== null && getGame(match[1]) !== undefined;
      },
      "ARCADE VAULT · FICHA DE MÁQUINA",
    ],
  ];

/** Respaldo para el 404 y para cualquier ruta que no tenga remate propio. */
const DEFAULT_TEXT = LIBRARY_TEXT;

export function SiteFooter({ text }: { text?: string }) {
  const pathname = usePathname();
  const line =
    text ?? BY_SECTION.find(([test]) => test(pathname))?.[1] ?? DEFAULT_TEXT;

  return (
    <footer className="border-t border-white/6 px-[clamp(14px,3vw,40px)] pt-5.5 pb-8.5 text-center text-[11px] tracking-av-wide text-av-line">
      {line}
    </footer>
  );
}
