/**
 * Los tres iconos de píxel de las tarjetas destacadas de «Acerca de». Puerto
 * literal de `HighlightIcon` en references/templates/home-about/about.jsx:
 * rectángulos sobre una rejilla de 16×16, sin curvas ni trazos finos.
 *
 * Mismo trato que `feature-icon.tsx`: el color no se elige aquí, se hereda con
 * `currentColor` del acento de la tarjeta, y es también lo que enciende el
 * `drop-shadow`. Los píxeles recortados del icono `BROWSER` toman `--av-bg` en
 * vez del `#0a0a0f` literal del template, para que sigan al tema y no al valor.
 */

import type { Highlight } from "@/lib/about";

const PATHS: Record<Highlight["icon"], React.ReactNode> = {
  HEART: (
    <>
      <rect x="2" y="3" width="4" height="2" />
      <rect x="10" y="3" width="4" height="2" />
      <rect x="1" y="4" width="2" height="4" />
      <rect x="13" y="4" width="2" height="4" />
      <rect x="2" y="8" width="2" height="2" />
      <rect x="12" y="8" width="2" height="2" />
      <rect x="3" y="9" width="10" height="2" />
      <rect x="4" y="11" width="8" height="2" />
      <rect x="5" y="12" width="6" height="2" />
      <rect x="6" y="13" width="4" height="1" />
      <rect x="7" y="14" width="2" height="1" />
    </>
  ),
  BROWSER: (
    <>
      <rect
        x="1"
        y="2"
        width="14"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect x="1" y="2" width="14" height="3" />
      <rect x="3" y="3" width="1" height="1" fill="var(--av-bg)" />
      <rect x="5" y="3" width="1" height="1" fill="var(--av-bg)" />
      <rect x="7" y="3" width="1" height="1" fill="var(--av-bg)" />
      <rect x="3" y="7" width="4" height="1" />
      <rect x="3" y="9" width="6" height="1" />
      <rect x="3" y="11" width="3" height="1" />
    </>
  ),
  PLANT: (
    <>
      <rect x="7" y="2" width="2" height="10" />
      <rect x="4" y="4" width="3" height="2" />
      <rect x="9" y="6" width="3" height="2" />
      <rect x="3" y="3" width="2" height="2" />
      <rect x="11" y="5" width="2" height="2" />
      <rect x="3" y="12" width="10" height="2" />
      <rect x="4" y="14" width="8" height="1" />
    </>
  ),
};

export function HighlightIcon({ kind }: { kind: Highlight["icon"] }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="size-9 flex-none [image-rendering:pixelated] filter-[drop-shadow(0_0_6px_currentColor)]"
    >
      {PATHS[kind]}
    </svg>
  );
}
