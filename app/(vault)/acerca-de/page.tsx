/**
 * Acerca de y contacto. Puerto de references/templates/home-about/about.jsx.
 *
 * Monta la pantalla entera de SPEC 03: misión, banda divisoria y la sección de
 * contacto con su formulario (`ContactForm`, que envía por Server Action).
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
import { ContactForm } from "@/components/contact-form";
import { HighlightIcon } from "@/components/highlight-icon";
import { Reveal } from "@/components/reveal";
import { CONTACT_INTRO, CONTACT_TIPS, HIGHLIGHTS, MISSION } from "@/lib/about";
import type { Accent } from "@/lib/landing";

export const metadata: Metadata = {
  title: "ACERCA DE",
  description: "Quiénes somos, por qué existe Arcade Vault y cómo escribirnos.",
};

/** Clases completas por acento: Tailwind no ve nombres interpolados. */
const ACCENT: Record<Accent, string> = {
  cyan: "text-av-cyan",
  magenta: "text-av-magenta",
  yellow: "text-av-yellow",
  amber: "text-av-amber",
};

/** El LED de cada aviso de la columna de contacto, encendido en su acento. */
const LED: Record<Accent, string> = {
  cyan: "bg-av-cyan shadow-[0_0_6px_var(--av-cyan)]",
  magenta: "bg-av-magenta shadow-[0_0_6px_var(--av-magenta)]",
  yellow: "bg-av-yellow shadow-[0_0_6px_var(--av-yellow)]",
  amber: "bg-av-amber shadow-[0_0_6px_var(--av-amber)]",
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
                <h2 className="font-display text-[10px] leading-normal tracking-widest text-av-text">
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

      {/* Contacto. La invitación a la izquierda y el formulario a la derecha,
          que es algo más ancho: lo que se escribe pesa más que lo que se lee.
          Por debajo de 900px se apilan, invitación primero. */}
      <Reveal>
        <section className="mx-auto max-w-300 px-[clamp(14px,3vw,40px)] pb-20">
          <div className="grid items-start gap-10 max-[900px]:gap-6 min-[900px]:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="font-display text-[11px] tracking-[0.24em] text-av-cyan av-glow-cyan">
                &gt;&gt; CONTACTO
              </p>

              <h2 className="mt-3.5 font-display text-[clamp(18px,3.5vw,36px)] leading-[1.35] tracking-av-wide text-av-cyan av-glow-cyan">
                CONTACTANOS
              </h2>

              <p className="mt-4.5 mb-6 text-[14px] leading-[1.7] tracking-av text-pretty text-av-text-dim">
                {CONTACT_INTRO}
              </p>

              <ul className="flex flex-col gap-2.5">
                {CONTACT_TIPS.map((tip) => (
                  <li
                    key={tip.text}
                    className="flex items-center gap-2.5 font-display text-[9px] leading-[1.6] tracking-[0.14em] text-av-text-dim"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2 flex-none rounded-full ${LED[tip.accent]}`}
                    />
                    {tip.text}
                  </li>
                ))}
              </ul>
            </div>

            <ContactForm />
          </div>
        </section>
      </Reveal>
    </main>
  );
}
