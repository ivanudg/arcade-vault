/**
 * Cabecera de las cuatro secciones numeradas de la portada. Puerto de
 * `.section-head` / `.kicker` / `.section-title` / `.section-rule` de
 * references/templates/home-about/styles.css.
 *
 * El número no es adorno: la portada se lee de arriba abajo y el kicker dice
 * en qué tramo del recorrido estás. La regla arranca en el gris de línea y se
 * apaga hacia la derecha, así que el peso visual queda en el título.
 *
 * El título va en Press Start 2P: llega en mayúsculas y sin tildes.
 */

import type { Accent } from "@/lib/landing";

/** Clases completas por acento: Tailwind no ve nombres interpolados. */
const KICKER: Record<Accent, string> = {
  cyan: "text-av-cyan av-glow-cyan",
  magenta: "text-av-magenta av-glow-magenta",
  yellow: "text-av-yellow av-glow-yellow",
  amber: "text-av-amber av-glow-amber",
};

export function SectionHead({
  index,
  title,
  accent,
}: {
  /** Orden de la sección dentro de la portada; se pinta como `// 01`. */
  index: number;
  title: string;
  accent: Accent;
}) {
  return (
    <div className="mb-9 flex items-center gap-4.5">
      <span
        className={`shrink-0 font-display text-[11px] tracking-[0.22em] ${KICKER[accent]}`}
      >
        {`// ${String(index).padStart(2, "0")}`}
      </span>
      <h2 className="min-w-0 font-display text-[clamp(13px,2.8vw,28px)] leading-[1.25] tracking-av text-av-text">
        {title}
      </h2>
      <span className="h-px min-w-6 flex-1 bg-linear-to-r from-av-line to-transparent" />
    </div>
  );
}
