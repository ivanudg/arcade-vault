/**
 * El contador de la Pokédex.
 *
 * La pantalla entera es de cliente —el contador, la petición y la revelación—,
 * así que aquí sólo queda la cabecera de sección y el `metadata`. No consulta
 * Supabase ni el catálogo, de modo que no necesita `dynamic = "force-dynamic"`
 * y se prerenderiza como HTML estático; lo que cambia lo pide el navegador.
 */

import type { Metadata } from "next";
import { PokedexCounter } from "@/components/pokedex-counter";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "CONTADOR",
  description:
    "Un contador que avanza de uno en uno por la Pokédex Nacional: cada número es una entrada, y cada entrada se revela desde su silueta.",
};

export default function CounterPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-300 px-[clamp(14px,3vw,40px)] pt-[clamp(44px,7vw,76px)] pb-20">
        <Reveal>
          <p className="font-display text-[11px] tracking-[0.24em] text-av-yellow av-glow-yellow">
            &gt;&gt; POKEDEX
          </p>

          <h1 className="mt-4.5 font-display text-[clamp(19px,5vw,46px)] leading-[1.4] tracking-av-wider text-av-text-bright av-glow-cyan">
            CONTADOR NACIONAL
          </h1>

          <p className="mt-6 max-w-[58ch] text-[15px] leading-[1.8] tracking-av text-pretty text-av-text-dim">
            El contador es el número de la entrada. Cada pulsación lo sube de uno en uno y el visor
            carga al inquilino de ese hueco, que entra en silueta y se revela.
          </p>
        </Reveal>

        <PokedexCounter />
      </section>
    </main>
  );
}
