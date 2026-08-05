/**
 * Lo que ocupa el sitio de la tabla cuando la máquina todavía no tiene marcas.
 *
 * Hermano de `ScoreboardUnavailable`, y la diferencia entre los dos es el punto
 * entero: aquél dice que no se pudo preguntar; éste, que se preguntó y el
 * marcador está por estrenar. Desde SPEC 07 ese vacío es el estado del día uno,
 * y enseñar ahí un aviso de avería sería mentir.
 *
 * Por eso no comparte ni el color ni el movimiento del aviso de avería: magenta
 * pulsando es alarma, y aquí no ha fallado nada. El amarillo es el del récord y
 * el del salón —la cifra que se persigue—, y el bloque sólo entra con el fundido
 * de siempre.
 *
 * El `01` de encima es el hueco del primer puesto: la tabla que rodea a este
 * bloque numera las marcas, y ésta es la fila que falta por escribir.
 */

export function ScoreboardEmpty() {
  return (
    <div className="flex flex-col items-center gap-3.5 px-4 py-14 text-center animate-av-fade">
      <span
        aria-hidden
        className="font-display text-[22px] leading-none text-av-yellow/22 [text-shadow:0_0_18px_rgba(245,255,0,0.14)]"
      >
        01
      </span>
      <p className="font-display text-[11px] leading-[1.6] tracking-av text-av-yellow av-glow-yellow">
        SE EL PRIMERO
      </p>
      <p className="max-w-[46ch] text-[12px] tracking-av text-av-text-dim">
        Todavía no hay marcas en esta máquina. Juega una partida y firma la primera.
      </p>
    </div>
  );
}
