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

import type { Metadata } from "next";
import Link from "next/link";
import { AccountLink } from "@/components/account-link";
import { ActivityFeed } from "@/components/activity-feed";
import { FeatureIcon } from "@/components/feature-icon";
import { HeroSilhouettes } from "@/components/hero-silhouettes";
import { MiniGameCard } from "@/components/mini-game-card";
import { Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/section-head";
import { TopPlayers } from "@/components/top-players";
import { GAMES } from "@/lib/games";
import { type Accent, FAQ, FEATURES, PLAN, STATS } from "@/lib/landing";
import { recentScores, topPlayers } from "@/lib/leaderboard";

/**
 * El título va en `absolute`: la plantilla del layout (`%s · Arcade Vault`)
 * dejaría la marca dos veces en la pestaña de la puerta de entrada. Aquí sí se
 * acentúa, que esto lo lee el navegador y no Press Start 2P.
 */
export const metadata: Metadata = {
  title: { absolute: "Arcade Vault · El arcade clásico está de vuelta" },
  description:
    "Juega gratis los clásicos del arcade en tu navegador. Sin descargas, sin cuenta obligatoria y con ranking global.",
};

/** Clases completas por acento: Tailwind no ve nombres interpolados. */
const ACCENT: Record<Accent, string> = {
  cyan: "text-av-cyan",
  magenta: "text-av-magenta",
  yellow: "text-av-yellow",
  amber: "text-av-amber",
};

/** El filo izquierdo de cada pregunta del FAQ, en el orden en que se leen. */
const FAQ_EDGE = ["border-l-av-cyan", "border-l-av-magenta", "border-l-av-yellow"];

/**
 * La portada lee el marcador, así que se renderiza en cada visita. Ver la nota
 * de `app/(vault)/juego/[id]/page.tsx`.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Las dos consultas en paralelo: no dependen una de otra y la portada no
  // tiene por qué esperar dos viajes seguidos.
  const [recent, ranking] = await Promise.all([recentScores(), topPlayers()]);
  const hasActivity = recent.length > 0 || ranking.length > 0;

  return (
    <main className="flex-1">
      {/* 61px es el alto de la cabecera pegajosa: el hero ocupa lo que queda
          de ventana. `svh` y no `vh` para que la barra del móvil no lo corte. */}
      <section className="relative flex min-h-[calc(100svh-61px)] items-center justify-center overflow-hidden px-[clamp(14px,3vw,40px)] pt-[clamp(48px,9vw,96px)] pb-[clamp(76px,10vw,120px)]">
        <HeroSilhouettes />

        <div className="relative z-10 mx-auto max-w-275 text-center animate-av-fade">
          <p className="font-display text-[11px] tracking-[0.24em] text-av-yellow av-glow-yellow">
            {/* Los símbolos del template (▸ ▶ ✦) no están en Press Start 2P y
                el navegador los sustituye por glifos de cuerpo, que al lado de
                una fuente de 20px de avance salen como una mota. Aquí se dibuja
                todo con ASCII, que la fuente sí cubre entero. */}
            &gt;&gt; INSERTA UNA MONEDA
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
            <br className="max-sm:hidden" /> Sin descargas. Sin costo. Solo diversión.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/biblioteca"
              className="bg-av-cyan px-8 py-5 font-display text-[12px] tracking-av-wider text-av-bg av-halo-cyan hover:bg-av-yellow"
            >
              &gt; EXPLORAR JUEGOS
            </Link>
            <AccountLink
              guest="* CREAR CUENTA"
              member="* MI CUENTA"
              className="border border-av-magenta px-8 py-5 font-display text-[12px] tracking-av-wider text-av-magenta hover:bg-av-magenta/12 hover:text-white"
            />
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
          <SectionHead index={1} title="¿POR QUE ARCADE VAULT?" accent="magenta" />
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
                <p className="text-[13px] leading-[1.6] text-av-text-dim">{feature.desc}</p>
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

      {/* Franja de cifras: el único bloque a ancho completo de la portada, con
          su velo amarillo. La primera cifra sale de `GAMES.length`. */}
      <Reveal>
        <section className="relative overflow-hidden border-y border-av-line bg-linear-to-b from-av-void to-av-bg px-[clamp(14px,3vw,40px)] py-[clamp(40px,7vw,60px)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,rgba(245,255,0,0.06),transparent_70%)]" />

          <div className="relative mx-auto grid max-w-300 gap-8 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div
                key={stat.unit}
                className="border-av-line px-5 py-5 text-center max-sm:border-t max-sm:first:border-t-0 sm:border-l sm:first:border-l-0"
              >
                <p className="font-display text-[clamp(26px,5vw,56px)] tracking-av text-av-yellow av-glow-yellow">
                  {stat.value}
                </p>
                <p className="mt-3 font-display text-[11px] tracking-[0.18em] text-av-text">
                  {stat.unit}
                </p>
                <p className="mt-2.5 text-[11px] tracking-[0.16em] text-av-text-faint">
                  {stat.note}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* 03 — Actividad. Los dos paneles salen del marcador compartido: la
          portada reacciona a lo que se juega y no contradice al salón.

          Sin marcador no hay sección: una cabecera de actividad sobre dos
          huecos afirma que no pasa nada, y lo que pasa es que no se sabe. El
          resto de la portada se ve igual. */}
      {hasActivity && (
        <section className="mx-auto max-w-330 px-[clamp(14px,3vw,40px)] py-[clamp(52px,8vw,80px)]">
          <Reveal>
            <SectionHead index={3} title="ACTIVIDAD EN VIVO" accent="yellow" />
          </Reveal>

          <Reveal>
            <div className="grid items-start gap-4.5 lg:grid-cols-[1.2fr_1fr]">
              {recent.length > 0 && <ActivityFeed rows={recent} />}
              {ranking.length > 0 && <TopPlayers rows={ranking} />}
            </div>
          </Reveal>
        </section>
      )}

      {/* 04 — Precios. El plan es gratis, así que la sección no vende: afirma.
          El template pinta esta tarjeta en verde y el importe con un degradado
          recortado sobre el texto; aquí van en cian con halo, que es el
          lenguaje del resto del sitio. */}
      <section className="mx-auto max-w-330 px-[clamp(14px,3vw,40px)] py-[clamp(52px,8vw,80px)]">
        <Reveal>
          <SectionHead index={4} title="PRECIOS" accent="amber" />
        </Reveal>

        <Reveal>
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <article className="relative flex flex-col gap-3.5 border border-av-cyan bg-linear-to-b from-av-panel to-av-void p-[clamp(22px,4vw,32px)] shadow-[0_0_28px_rgba(0,245,255,0.18),inset_0_0_14px_rgba(0,245,255,0.08)]">
              {/* El filo interior de puntos: el borde troquelado de un vale
                  de máquina. Decorativo, fuera del flujo y del puntero. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-1 border border-dashed border-av-cyan/30"
              />

              {/* Sale del marco por la esquina, como el sello que se estampa
                  encima cuando ya está impreso. El desbordamiento cabe en el
                  acolchado de la sección: a 360 px no empuja la página. */}
              <span className="absolute -top-3.5 -right-1 z-10 rotate-14 border-2 border-av-magenta bg-av-void/85 px-4 py-2.5 text-center font-display text-[clamp(10px,2.4vw,13px)] leading-[1.15] tracking-[0.16em] text-av-magenta av-glow-magenta av-halo-magenta">
                FREE
                <br />
                PLAY
              </span>

              <p className="font-display text-[9px] tracking-[0.22em] text-av-text-dim">
                {PLAN.label}
              </p>
              <p className="font-display text-[clamp(13px,2.6vw,16px)] tracking-av-wide text-av-cyan av-glow-cyan">
                {PLAN.name}
              </p>

              <p className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
                <span className="font-display text-[clamp(38px,8vw,64px)] tracking-av text-av-text-bright av-glow-cyan">
                  {PLAN.amount}
                </span>
                <span className="font-display text-[11px] tracking-[0.16em] text-av-text-dim">
                  {PLAN.unit}
                </span>
              </p>

              <p className="font-display text-[9px] leading-[1.6] tracking-[0.18em] text-av-yellow av-glow-yellow">
                {PLAN.tag}
              </p>

              <ul className="mt-2.5 flex flex-col gap-2">
                {PLAN.perks.map((perk) => (
                  <li key={perk} className="flex gap-2.5 text-[13px] text-av-text">
                    <span aria-hidden="true" className="text-av-cyan">
                      ✔
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              <AccountLink
                guest="EMPEZAR GRATIS →"
                member="IR A MI CUENTA →"
                className="mt-auto block bg-av-cyan px-8 py-5 text-center font-display text-[clamp(11px,2.4vw,14px)] tracking-av-wider text-av-bg av-halo-cyan hover:bg-av-yellow"
              />

              <p className="text-center text-[11px] tracking-widest text-av-text-faint">
                {PLAN.foot}
              </p>
            </article>

            {/* Las tres preguntas se reparten el alto de la tarjeta: alineadas
                al centro dejaban un hueco de cien píxeles arriba y otro abajo. */}
            <div className="flex flex-col gap-3.5">
              {FAQ.map((item, i) => (
                <article
                  key={item.q}
                  className={`flex flex-1 flex-col justify-center border border-av-line border-l-4 bg-av-panel-raised px-5 py-4.5 ${FAQ_EDGE[i % FAQ_EDGE.length]}`}
                >
                  <h3 className="font-display text-[10px] leading-[1.6] tracking-[0.12em] text-av-text">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[1.6] text-av-text-dim">{item.a}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Remate. Dos filamentos de neón encierran la última llamada, como el
          marco de una pantalla de atracción. El botón repite el magenta
          pulsante de `JUGAR` en la ficha de cada máquina: es el mismo gesto,
          meter la moneda. */}
      <Reveal>
        <section className="relative mx-auto max-w-225 px-[clamp(14px,3vw,40px)] pt-[clamp(70px,10vw,100px)] pb-[clamp(84px,11vw,120px)] text-center">
          <span
            aria-hidden="true"
            className="absolute top-7 left-1/2 h-px w-3/5 -translate-x-1/2 bg-linear-to-r from-transparent via-av-cyan to-transparent"
          />

          <h2 className="font-display text-[clamp(15px,4vw,40px)] leading-[1.4] tracking-av-wide text-av-yellow av-glow-yellow">
            ¿LISTO PARA JUGAR?
          </h2>

          <Link
            href="/biblioteca"
            className="mt-9 inline-block bg-av-magenta px-11 py-6 font-display text-[clamp(11px,2.6vw,14px)] tracking-av-wider text-av-bg animate-av-pulse hover:bg-av-yellow"
          >
            INSERTAR MONEDA →
          </Link>

          <p className="mt-7 text-[13px] tracking-av text-av-text-dim">
            Gratis. Sin registro obligatorio. Empieza en segundos.
          </p>

          <span
            aria-hidden="true"
            className="absolute bottom-7 left-1/2 h-px w-3/5 -translate-x-1/2 bg-linear-to-r from-transparent via-av-cyan to-transparent"
          />
        </section>
      </Reveal>
    </main>
  );
}
