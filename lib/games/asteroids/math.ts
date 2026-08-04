/**
 * Utilidades de Asteroids, portadas del bloque `Utils` del original.
 *
 * `wrap` es lo que hace toroidal el espacio: sales por un borde y entras por el
 * opuesto. El resto es aritmética de toda la vida.
 */

/** Un punto cualquiera: naves, balas, asteroides y power-ups lo cumplen. */
export interface Point {
  x: number;
  y: number;
}

/** Envuelve `v` al rango `[0, max)`, también con valores negativos. */
export const wrap = (v: number, max: number): number => ((v % max) + max) % max;

/** Distancia euclídea entre dos puntos. */
export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Real aleatorio en `[min, max)`. */
export const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/** Entero aleatorio en `[min, max]`, ambos incluidos. */
export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
