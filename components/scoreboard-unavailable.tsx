/**
 * Lo que ocupa el sitio de la tabla cuando el marcador no contesta.
 *
 * Vive en un solo archivo porque lo pintan dos pantallas —el salón y la ficha—
 * y un aviso que dice dos cosas distintas según dónde salga es peor que no
 * decir nada.
 *
 * Distingue vacío de roto a propósito: sin este bloque, una base de datos
 * pausada y una máquina sin marcas se ven igual. No inventa filas.
 */

export function ScoreboardUnavailable() {
  return (
    <div className="flex flex-col items-center gap-3.5 px-4 py-14 text-center animate-av-fade">
      <p className="font-display text-[11px] leading-[1.6] tracking-av text-av-magenta av-glow-magenta animate-av-pulse motion-reduce:animate-none">
        MARCADOR NO DISPONIBLE
      </p>
      <p className="max-w-[46ch] text-[12px] tracking-av text-av-text-dim">
        Sin conexión con la base de datos. Vuelve a cargar en un momento.
      </p>
    </div>
  );
}
