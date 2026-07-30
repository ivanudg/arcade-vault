"use client";

/**
 * Pie compartido. Cada pantalla remata con su propia línea, copiada literal de
 * las plantillas; el texto entra por prop y, si no se pasa, se deduce de la
 * ruta para que el layout pueda montar el pie una sola vez.
 */

import { usePathname } from "next/navigation";
import { getGame } from "@/lib/games";

/** Los cuatro remates de references/templates/, con sus tildes en minúscula. */
const BY_SECTION: ReadonlyArray<[test: (path: string) => boolean, text: string]> =
  [
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

const DEFAULT_TEXT = "ARCADE VAULT · 8 MÁQUINAS · INSERTA UNA MONEDA";

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
