/**
 * Lo que ocupa el sitio de la rejilla cuando el catálogo no tiene máquinas.
 *
 * Hermano de `CatalogUnavailable`, y la diferencia entre los dos es el punto
 * entero: aquél dice que no se pudo preguntar; éste, que se preguntó y no hay
 * ninguna. Es la misma distinción que el marcador lleva desde SPEC 07, y por
 * eso tampoco comparte el color ni el movimiento de la avería: magenta pulsando
 * es alarma, y aquí no ha fallado nada.
 *
 * El `[ ]` de encima es una ranura vacía: la rejilla que rodea a este bloque
 * son gabinetes, y éste es el hueco donde no hay ninguno. Es el papel que
 * cumple el `01` de `ScoreboardEmpty` —el hueco del primer puesto en una tabla
 * numerada—, y va con otro glifo a propósito, porque aquí no se numera nada y
 * un `01` sería adorno.
 */

export function CatalogEmpty() {
  return (
    <div className="flex flex-col items-center gap-3.5 px-4 py-14 text-center animate-av-fade">
      <span
        aria-hidden
        className="font-display text-[22px] leading-none text-av-yellow/22 [text-shadow:0_0_18px_rgba(245,255,0,0.14)]"
      >
        [ ]
      </span>
      <p className="font-display text-[11px] leading-[1.6] tracking-av text-av-yellow av-glow-yellow">
        EL VAULT ESTA VACIO
      </p>
      <p className="max-w-[46ch] text-[12px] tracking-av text-av-text-dim">
        No hay ninguna máquina en el catálogo todavía. Vuelve a asomarte pronto.
      </p>
    </div>
  );
}
