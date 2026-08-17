/**
 * Lo que ocupa el sitio de la rejilla cuando el catálogo no contesta.
 *
 * Gemelo de `ScoreboardUnavailable` y por el mismo motivo: desde SPEC 17 las
 * máquinas salen de `public.games`, así que la pantalla tiene que saber decir
 * que no se pudo preguntar. Vive en un solo archivo porque lo pintan varias
 * pantallas y un aviso que dice dos cosas distintas según dónde salga es peor
 * que no decir nada.
 *
 * Comparte el lenguaje del aviso del marcador —magenta que pulsa es avería— y
 * hasta la misma frase de cuerpo, porque la causa y el remedio son los mismos.
 * Lo que cambia es el rótulo, que es lo único que hace falta para saber qué se
 * ha caído.
 */

export function CatalogUnavailable() {
  return (
    <div className="flex flex-col items-center gap-3.5 px-4 py-14 text-center animate-av-fade">
      <p className="font-display text-[11px] leading-[1.6] tracking-av text-av-magenta av-glow-magenta animate-av-pulse motion-reduce:animate-none">
        CATALOGO NO DISPONIBLE
      </p>
      <p className="max-w-[46ch] text-[12px] tracking-av text-av-text-dim">
        Sin conexión con la base de datos. Vuelve a cargar en un momento.
      </p>
    </div>
  );
}
