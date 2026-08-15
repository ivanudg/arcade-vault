/**
 * Las tres utilidades de Frogger. Sin estado, sin `ctx` y sin nada del DOM: se
 * leen y se comprueban de un vistazo, que es justo lo que no se puede hacer con
 * el closure de `mount()`.
 *
 * Ninguna sortea nada, y eso no es casualidad: en este motor los
 * carriles, las tortugas, el cocodrilo, la mosca y la dama-rana son funciones
 * del tiempo y de la ronda, así que dos partidas de la misma ronda se juegan
 * igual y una posición se reproduce en la consola sin montar el juego.
 */

/**
 * El doble módulo, en un sitio y no en diez.
 *
 * El `%` de JavaScript devuelve negativo con dividendo negativo, y la mitad de
 * los carriles tienen `speed < 0`, así que lo producen desde el primer segundo:
 * sin esto, sus plataformas aparecerían fuera de pantalla. `wrapSpan(-10, 640)`
 * vale 630, no −10.
 */
export function wrapSpan(v: number, span: number): number {
  return ((v % span) + span) % span;
}

/**
 * ¿Solapan los segmentos `[a, a + la]` y `[b, b + lb]`?
 *
 * Tocarse por el extremo no cuenta: un coche que acaba justo donde empieza la
 * rana no la ha atropellado.
 */
export function overlap(a: number, la: number, b: number, lb: number): boolean {
  return a < b + lb && b < a + la;
}

/**
 * Posición dentro de un ciclo de `c` segundos. Es `wrapSpan` con otro nombre
 * porque es otra cosa —tiempo, no píxeles—, y las dos se leen mejor en su sitio
 * que una sola llamada desde los dos. `cycleAt(-1, 4)` vale 3.
 */
export function cycleAt(t: number, c: number): number {
  return wrapSpan(t, c);
}
