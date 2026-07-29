// Marcador del paso 1 de specs/01-mvp-visual.md: sólo el rótulo.
// El buscador, los filtros y la rejilla de tarjetas llegan en el paso 10.
export default function Home() {
  return (
    <main className="relative z-2 mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-center justify-center px-[clamp(14px,3vw,40px)] py-[clamp(22px,4vw,44px)] text-center">
      <h1 className="font-display text-av-hero leading-[1.24] tracking-av-wider text-av-cyan av-glow-cyan animate-av-flicker">
        ARCADE
        <br />
        <span className="text-av-magenta av-glow-magenta">VAULT</span>
      </h1>
      <p className="mt-[22px] font-display text-av-label tracking-av-wider text-av-yellow av-glow-yellow animate-av-caret">
        INSERTA UNA MONEDA PARA JUGAR
      </p>
    </main>
  );
}
