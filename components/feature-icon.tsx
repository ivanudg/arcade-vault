/**
 * Los cuatro iconos de píxel de las tarjetas de ventajas. Puerto literal de
 * `FeatureIcon` en references/templates/home-about/home.jsx: rectángulos sobre
 * una rejilla de 16×16, sin curvas ni trazos finos.
 *
 * El color no se elige aquí: se hereda con `currentColor` del acento que lleve
 * la tarjeta, y es también lo que enciende el `drop-shadow`.
 */

import type { Feature } from "@/lib/landing";

const PATHS: Record<Feature["icon"], React.ReactNode> = {
  GAMEPAD: (
    <>
      <rect x="2" y="6" width="12" height="6" />
      <rect x="0" y="8" width="2" height="4" />
      <rect x="14" y="8" width="2" height="4" />
      <rect x="3" y="8" width="2" height="2" />
      <rect x="2" y="9" width="4" height="0.5" />
      <rect x="11" y="7" width="1.5" height="1.5" />
      <rect x="11" y="10" width="1.5" height="1.5" />
    </>
  ),
  FREE: (
    <>
      <rect
        x="3"
        y="3"
        width="10"
        height="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect x="5" y="6" width="1.5" height="4" />
      <rect x="5" y="6" width="4" height="1.5" />
      <rect x="5" y="8" width="3" height="1" />
      <rect x="10" y="6" width="1.5" height="4" />
    </>
  ),
  TROPHY: (
    <>
      <rect x="3" y="2" width="10" height="2" />
      <rect x="3" y="2" width="2" height="6" />
      <rect x="11" y="2" width="2" height="6" />
      <rect x="5" y="8" width="6" height="2" />
      <rect x="7" y="10" width="2" height="3" />
      <rect x="5" y="13" width="6" height="1.5" />
      <rect x="1" y="3" width="2" height="3" />
      <rect x="13" y="3" width="2" height="3" />
    </>
  ),
  ROCKET: (
    <>
      <rect x="7" y="1" width="2" height="2" />
      <rect x="6" y="3" width="4" height="2" />
      <rect x="5" y="5" width="6" height="6" />
      <rect x="4" y="11" width="2" height="2" />
      <rect x="10" y="11" width="2" height="2" />
      <rect x="7" y="6" width="2" height="2" fill="var(--av-bg)" />
      <rect x="6" y="13" width="1" height="2" />
      <rect x="9" y="13" width="1" height="2" />
    </>
  ),
};

export function FeatureIcon({ kind }: { kind: Feature["icon"] }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="size-11 filter-[drop-shadow(0_0_8px_currentColor)]"
    >
      {PATHS[kind]}
    </svg>
  );
}
