/**
 * Acerca de y contacto. Puerto de references/templates/home-about/about.jsx.
 *
 * De momento monta la mitad de arriba —misión y banda divisoria—; la sección
 * de contacto y su formulario llegan en los pasos siguientes de SPEC 03.
 *
 * El kicker es propio (`>> ACERCA DE`) y no el `// 01` numerado de
 * `SectionHead`: la numeración de la portada cuenta las paradas de un recorrido
 * que aquí no existe, y el template también rotula esta pantalla por su nombre.
 *
 * El titular del template va con un degradado recortado sobre el texto; aquí
 * repite el tratamiento que ya fijó SPEC 02 para el importe del plan —texto
 * claro con halo cian—, que es el lenguaje del resto del sitio.
 */

import type { Metadata } from "next";
import { HighlightIcon } from "@/components/highlight-icon";
import { Reveal } from "@/components/reveal";
import { HIGHLIGHTS, MISSION } from "@/lib/about";
import type { Accent } from "@/lib/landing";

export const metadata: Metadata = {
  title: "ACERCA DE",
  description:
    "Quiénes somos, por qué existe Arcade Vault y cómo escribirnos.",
};

/** Clases completas por acento: Tailwind no ve nombres interpolados. */
const ACCENT: Record<Accent, string> = {
  cyan: "text-av-cyan",
  magenta: "text-av-magenta",
  yellow: "text-av-yellow",
  amber: "text-av-amber",
};

/** Los tres colores que alternan los píxeles de la banda divisoria. */
const PIXEL: Record<"cyan" | "magenta" | "yellow", string> = {
  cyan: "bg-av-cyan shadow-[0_0_6px_var(--av-cyan)]",
  magenta: "bg-av-magenta shadow-[0_0_6px_var(--av-magenta)]",
  yellow: "bg-av-yellow shadow-[0_0_6px_var(--av-yellow)]",
};

/**
 * El reparto de color del template, que lo resolvía con `:nth-child(3n)` y
 * `:nth-child(5n)`. El quinto gana al tercero porque va después en la hoja.
 */
function pixelAccent(position: number) {
  if (position % 5 === 0) return PIXEL.yellow;
  if (position % 3 === 0) return PIXEL.magenta;
  return PIXEL.cyan;
}

export default function AboutPage() {
  return (
    <main className="flex-1">
      {/* Misión. Va centrada y sin tarjeta: es la declaración de intenciones,
          no una sección más del recorrido. */}
      <section className="mx-auto max-w-275 px-[clamp(14px,3vw,40px)] pt-[clamp(48px,8vw,80px)] pb-10 text-center">
        <Reveal>
          <p className="font-display text-[11px] tracking-[0.24em] text-av-yellow av-glow-yellow">
            &gt;&gt; ACERCA DE
          </p>

          <h1 className="mt-4.5 font-display text-[clamp(19px,5vw,52px)] leading-[1.4] tracking-av-wider text-av-text-bright av-glow-cyan">
            ACERCA DE ARCADE VAULT
          </h1>

          <p className="mx-auto mt-7 max-w-180 text-[15px] leading-[1.8] tracking-av text-pretty text-av-text-dim">
            {MISSION}
          </p>
        </Reveal>

        {/* Las tres tarjetas se elevan y toman su acento al pasar el ratón: el
            color lo pone la tarjeta y lo recogen el icono, el borde y la
            sombra con `currentColor`. El rótulo se queda neutro. */}
        <div className="mt-13 grid gap-4.5 min-[820px]:grid-cols-3">
          {HIGHLIGHTS.map((highlight, i) => (
            <Reveal key={highlight.text} className="h-full" delay={i * 80}>
              <article
                className={`flex h-full items-center gap-4 border border-av-line bg-av-panel-raised px-5 py-4.5 text-left transition duration-200 hover:-translate-y-0.75 hover:border-current hover:shadow-[0_12px_28px_-14px_currentColor] ${ACCENT[highlight.accent]}`}
              >
                <HighlightIcon kind={highlight.icon} />
                <h2 className="font-display text-[10px] leading-[1.5] tracking-[0.1em] text-av-text">
                  {highlight.text}
                </h2>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Banda divisoria: dos filamentos magenta y veinticuatro píxeles que
          parpadean escalonados, como la fila de testigos de una máquina en
          reposo. Es puro adorno, así que no lo anuncia el lector de pantalla. */}
      <Reveal>
        <div
          aria-hidden="true"
          className="mx-auto flex max-w-300 items-center gap-4 px-[clamp(14px,3vw,40px)] py-15"
        >
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-av-magenta to-transparent" />

          <div className="flex gap-1">
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                style={{ animationDelay: `${i * 80}ms` }}
                className={`size-1.5 animate-av-px ${pixelAccent(i + 1)}`}
              />
            ))}
          </div>

          <span className="h-px flex-1 bg-linear-to-r from-transparent via-av-magenta to-transparent" />
        </div>
      </Reveal>
    </main>
  );
}
