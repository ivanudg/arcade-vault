/**
 * Portada del vault. Puerto de references/templates/home-about/home.jsx.
 *
 * De momento monta el hero; las secciones restantes llegan en los pasos
 * siguientes de SPEC 02. El catálogo que ocupaba esta ruta vive en
 * `/biblioteca`.
 *
 * Los rótulos van sin tildes (`CLASICO ESTA`) porque Press Start 2P no tiene
 * glifos acentuados; es la misma regla que sigue `lib/games.ts`. El cuerpo del
 * subtítulo va en Courier Prime y sí se acentúa.
 */

import Link from "next/link";
import { FeatureIcon } from "@/components/feature-icon";
import { HeroSilhouettes } from "@/components/hero-silhouettes";
import { MiniGameCard } from "@/components/mini-game-card";
import { Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/section-head";
import { GAMES } from "@/lib/games";
import { type Accent, FEATURES } from "@/lib/landing";

/** Clases completas por acento: Tailwind no ve nombres interpolados. */
const ACCENT: Record<Accent, string> = {
  cyan: "text-av-cyan",
  magenta: "text-av-magenta",
  yellow: "text-av-yellow",
  amber: "text-av-amber",
};

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* 61px es el alto de la cabecera pegajosa: el hero ocupa lo que queda
          de ventana. `svh` y no `vh` para que la barra del móvil no lo corte. */}
      <section className="relative flex min-h-[calc(100svh-61px)] items-center justify-center overflow-hidden px-[clamp(14px,3vw,40px)] pt-[clamp(48px,9vw,96px)] pb-[clamp(76px,10vw,120px)]">
        <HeroSilhouettes />

        <div className="relative z-10 mx-auto max-w-275 text-center animate-av-fade">
          <p className="font-display text-[11px] tracking-[0.24em] text-av-yellow av-glow-yellow">
            ▸ INSERTA UNA MONEDA
            <span className="animate-av-caret">_</span>
          </p>

          <h1 className="mt-6.5 font-display text-[clamp(19px,5.6vw,54px)] leading-[1.42] tracking-av-wider text-av-text-bright">
            {/* Las tres líneas parpadean, desfasadas entre sí: tres tubos de
                neón que fallan por su cuenta, no un titular que se apaga
                entero. El retardo es negativo para que ninguna arranque a
                media caída. */}
            <span className="block animate-av-flicker">EL ARCADE</span>
            <span className="mt-3.5 block text-av-cyan av-glow-cyan animate-av-flicker [animation-delay:-2s] motion-reduce:delay-0">
              CLASICO ESTA
            </span>
            <span className="mt-3.5 block text-av-magenta av-glow-magenta animate-av-flicker [animation-delay:-4s] motion-reduce:delay-0">
              DE VUELTA
            </span>
          </h1>

          <p className="mx-auto mt-7.5 max-w-160 text-[15px] leading-[1.7] tracking-av text-pretty text-av-text-dim">
            Juega los mejores clásicos directamente en tu navegador.
            <br className="max-sm:hidden" /> Sin descargas. Sin costo. Solo
            diversión.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/biblioteca"
              className="bg-av-cyan px-8 py-5 font-display text-[12px] tracking-av-wider text-av-bg av-halo-cyan hover:bg-av-yellow"
            >
              ▶ EXPLORAR JUEGOS
            </Link>
            <Link
              href="/cuenta"
              className="border border-av-magenta px-8 py-5 font-display text-[12px] tracking-av-wider text-av-magenta hover:bg-av-magenta/12 hover:text-white"
            >
              ✦ CREAR CUENTA
            </Link>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-display text-[9px] tracking-[0.2em] text-av-text-faint"
        >
          <span>DESLIZA</span>
          <span className="text-av-cyan animate-av-bounce">▼</span>
        </div>
      </section>

      {/* 01 — Por qué el vault. El acento de cada tarjeta lo pinta el texto y
          el borde lo recoge con `currentColor` al pasar el ratón. */}
      <section className="mx-auto max-w-330 px-[clamp(14px,3vw,40px)] py-[clamp(52px,8vw,80px)]">
        <Reveal>
          <SectionHead
            index={1}
            title="¿POR QUE ARCADE VAULT?"
            accent="magenta"
          />
        </Reveal>

        <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} className="h-full" delay={i * 80}>
              <article
                className={`flex h-full flex-col gap-3.5 border border-av-line bg-linear-to-b from-av-panel to-av-panel-raised p-6 transition duration-200 hover:-translate-y-1.5 hover:border-current hover:shadow-[0_18px_40px_-16px_currentColor] ${ACCENT[feature.accent]}`}
              >
                <FeatureIcon kind={feature.icon} />
                <h3 className="font-display text-[12px] tracking-widest [text-shadow:0_0_8px_currentColor]">
                  {feature.title}
                </h3>
                <p className="text-[13px] leading-[1.6] text-av-text-dim">
                  {feature.desc}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 02 — Las seis primeras máquinas del catálogo. */}
      <section className="mx-auto max-w-330 px-[clamp(14px,3vw,40px)] py-[clamp(52px,8vw,80px)]">
        <Reveal>
          <SectionHead index={2} title="JUEGOS DISPONIBLES AHORA" accent="cyan" />
        </Reveal>

        <Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {GAMES.slice(0, 6).map((game) => (
              <MiniGameCard key={game.id} game={game} />
            ))}
          </div>

          <div className="mt-7 text-center">
            <Link
              href="/biblioteca"
              className="inline-block border border-av-cyan px-7 py-4 font-display text-[11px] tracking-av text-av-cyan hover:bg-av-cyan/12 hover:text-white"
            >
              VER TODOS LOS JUEGOS →
            </Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
