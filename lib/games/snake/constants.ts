/**
 * Constantes de Snake. Al contrario que las de las otras tres máquinas, éstas no
 * salen de ningún original: Snake es el primer motor del vault escrito desde
 * cero —el material de referencia son 46 líneas de coordenadas de sprites y ni
 * una de lógica—, así que las cifras las fija SPEC 10 y aquí se copian sin
 * reinterpretar, exactamente como se copiarían las de un puerto.
 *
 * Quien quiera reequilibrar el juego lo hace aquí y contra ese documento: los
 * siete números del ritmo y la puntuación viven juntos a propósito, para que
 * ajustarlos no obligue a tocar el motor.
 */

// ── Mundo y rejilla ──────────────────────────────────────────────────────────

/**
 * El mundo de Asteroids y Arkanoid, que ya entra de sobra en el gabinete sin
 * que `CABINET_CHROME` lo encoja. Un mundo cuadrado desperdiciaría ancho.
 */
export const W = 800;
export const H = 600;

/** Lado de la celda, en píxeles del mundo. */
export const CELL = 32;
export const COLS = 25; // W / CELL
export const ROWS = 20; // H / CELL

// ── Reglas ───────────────────────────────────────────────────────────────────

export const LIVES = 3;

/** Segmentos con los que nace la serpiente, y con los que reaparece. */
export const START_LEN = 3;

// ── Ritmo ────────────────────────────────────────────────────────────────────

/** Milisegundos por celda. El nivel 1 empieza en 150 y el 10 toca el suelo. */
export const TICK_START = 150;
export const TICK_STEP = 10;
export const TICK_MIN = 60;
export const MAX_LEVEL = 10;

// ── Puntuación ───────────────────────────────────────────────────────────────

/** Frutas que hacen subir un nivel. */
export const FRUITS_PER_LEVEL = 5;

/** Puntos por fruta: `POINTS_PER_FRUIT * level`. */
export const POINTS_PER_FRUIT = 10;

// ── Colores ──────────────────────────────────────────────────────────────────

/**
 * El fondo del vault, no un color propio del tablero: la escena archivada que
 * hace de miniatura se dibuja sobre él, así que la partida y la miniatura se ven
 * iguales. Va opaco y cubre el mundo entero, o sea que borra el frame anterior.
 */
export const COLOR_BG = "#0a0a0f";

export const COLOR_BODY = "#00f5ff";
export const COLOR_HEAD = "#f5ff00";

/**
 * La fruta cuando el atlas no ha cargado, o no cargará nunca. Magenta y no cian
 * porque el cian es el color del cuerpo: una fruta invisible justo cuando la
 * imagen ha fallado.
 */
export const COLOR_FRUIT_FALLBACK = "#ff006e";

export const COLOR_GRID = "rgba(0,245,255,0.1)";

/**
 * Duración del tick del nivel `level`, en milisegundos.
 *
 * El nivel 10 vale 60 ms y es el último que acelera; a partir de ahí se sigue
 * jugando al mismo ritmo hasta perder.
 */
export function tickFor(level: number): number {
  return Math.max(TICK_START - (level - 1) * TICK_STEP, TICK_MIN);
}
