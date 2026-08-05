/**
 * Constantes de Tetris, copiadas de
 * `references/started-games/03-tetris/game.js` sin cambiar un número.
 *
 * El original está equilibrado y la curva entera —velocidad de caída, valor de
 * las líneas, margen para deslizar una pieza apoyada— sale de estos valores.
 * Las únicas dos que no vienen de allí son `DAS_MS` y `ARR_MS`, y están
 * explicadas donde se declaran.
 *
 * Del catálogo de piezas y colores del original entran los siete tetrominós: la
 * tuerca, los power-ups, el comodín, los pentominós y el monominó esperan a su
 * propia spec.
 */

/** Una celda del tablero o de una pieza: 0 = vacía, 1..7 = tetrominó. */
export type Cell = number;

// ── Geometría ────────────────────────────────────────────────────────────────

export const COLS = 10;
export const ROWS = 20;
/** Lado de una celda en píxeles lógicos. */
export const BLOCK = 30;

/**
 * Mundo lógico: los 300 px del tablero más 120 px de banda derecha para la
 * pieza siguiente, que es el ancho exacto del `#next-canvas` del original. El
 * canvas se escala; estas dos cifras no cambian.
 */
export const WORLD = { width: COLS * BLOCK + 120, height: ROWS * BLOCK };

// ── Piezas ───────────────────────────────────────────────────────────────────

/**
 * Color de cada tipo de pieza. El índice es el valor de la celda, así que el
 * hueco del 0 —la celda vacía— se conserva del original: las matrices de
 * `PIECES` llevan el número del tipo dentro, y desplazar el índice obligaría a
 * restar uno en cada dibujo.
 */
export const COLORS: readonly (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#64b5f6", // J - azul pálido
  "#ffb74d", // L - orange
];

/** Líneas de la rejilla del tablero: el `GRID_COLORS.dark` del original. */
export const GRID_COLOR = "#22222e";

/**
 * Las siete matrices, con la I en 4×4 y la O en 2×2 para que roten sobre su
 * centro. Mismo índice que `COLORS`.
 */
export const PIECES: readonly (readonly Cell[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

/** Cuántos tipos de pieza hay. `randomPiece()` sortea en `[1, TYPES]`. */
export const TYPES = 7;

// ── Reglas ───────────────────────────────────────────────────────────────────

/** Puntos por líneas limpiadas de golpe, antes de multiplicar por el nivel. */
export const LINE_SCORES = [0, 100, 300, 500, 800];

/** Desplazamientos que prueba una rotación, en orden, antes de rendirse. */
export const KICKS = [0, -1, 1, -2, 2];

/** Margen para deslizar una pieza ya apoyada antes de que se consolide. */
export const LOCK_DELAY_MS = 500;
/** Tope de reinicios de ese margen por pieza: corta el infinite spin. */
export const LOCK_RESET_MAX = 15;

/** Piezas precalculadas. `queue[0]` es la siguiente. */
export const QUEUE_MAX = 5;

// ── Repetición al mantener ───────────────────────────────────────────────────

/**
 * Las dos únicas constantes que no salen del original, y la única desviación de
 * «copia literal».
 *
 * El original no las necesita porque se apoya sin saberlo en el auto-repeat del
 * teclado del sistema operativo, que dispara `keydown` repetidos al mantener
 * una tecla. El `press()` del mando táctil no produce ninguno, así que sin esto
 * en móvil cada celda cuesta un toque.
 *
 * `DAS_MS` es la espera antes del primer repetido y `ARR_MS` el intervalo entre
 * repetidos. Se aplican a `←`, `→` y `↓`; `↑` y `ESPACIO` son solo flanco.
 */
export const DAS_MS = 170;
export const ARR_MS = 50;
