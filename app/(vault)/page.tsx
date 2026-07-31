/**
 * Portada del vault. Puerto de references/templates/home-about/home.jsx.
 *
 * De momento sólo monta el titular del hero: el catálogo que ocupaba esta ruta
 * se mudó a `/biblioteca`. Las siete secciones se añaden en los pasos
 * siguientes de SPEC 02, y el hero completo en el paso 8.
 *
 * El titular va sin tildes (`CLASICO ESTA`) porque Press Start 2P no tiene
 * glifos acentuados; es la misma regla que sigue `lib/games.ts`.
 */

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="px-[clamp(14px,3vw,40px)] py-[clamp(56px,12vw,120px)]">
        <h1 className="mx-auto max-w-310 text-center font-display text-[clamp(19px,5.6vw,54px)] leading-[1.42] tracking-av-wider text-av-text-bright">
          {/* Las tres líneas parpadean, desfasadas entre sí: tres tubos de
              neón que fallan por su cuenta, no un titular que se apaga entero.
              El retardo es negativo para que ninguna arranque a media caída. */}
          <span className="block animate-av-flicker">EL ARCADE</span>
          <span className="mt-3.5 block text-av-cyan av-glow-cyan animate-av-flicker [animation-delay:-2s] motion-reduce:[animation-delay:0ms]">
            CLASICO ESTA
          </span>
          <span className="mt-3.5 block text-av-magenta av-glow-magenta animate-av-flicker [animation-delay:-4s] motion-reduce:[animation-delay:0ms]">
            DE VUELTA
          </span>
        </h1>
      </section>
    </main>
  );
}
