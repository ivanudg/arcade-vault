/**
 * Constantes de Frogger. Como las de Snake, no salen de ningún original:
 * `references/started-games/` se agotó con Arkanoid y de Frogger no hay ni un
 * `game.js` que portar ni un atlas de sprites. Las cifras las fija SPEC 14 y
 * aquí se copian sin reinterpretar, exactamente como se copiarían las de un
 * puerto.
 *
 * Quien quiera reequilibrar el juego lo hace aquí: el ritmo, la puntuación, los
 * ciclos de la fauna y las rondas de aparición viven juntos a propósito, para
 * que ajustarlos no obligue a tocar el motor. La progresión por ronda —qué
 * carril lleva camiones y a qué velocidad— es lo único que vive fuera, en
 * `lanes.ts`, porque es una función y no un dato.
 */

// ── Mundo y rejilla ──────────────────────────────────────────────────────────

/**
 * Rejilla de 15 × 13 celdas de 40 px. El mundo es apaisado, no vertical: el
 * Frogger de salón es alto, pero Tetris ya demostró que un mundo vertical
 * obliga al gabinete a la rama de altura de su `calc()`. Uno ligeramente
 * apaisado cabe siempre y da más recorrido a coches y plataformas.
 */
export const CELL = 40;
export const COLS = 15;
export const ROWS = 13;
export const W = 600; // COLS * CELL
export const H = 520; // ROWS * CELL

/** Las trece filas, de arriba abajo. Son índices, no píxeles. */
export const ROW_HOMES = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOTTOM = 5;
export const ROW_MEDIAN = 6;
export const ROW_ROAD_TOP = 7;
export const ROW_ROAD_BOTTOM = 11;
export const ROW_START = 12;

// ── Reglas ───────────────────────────────────────────────────────────────────

export const LIVES = 3;
export const HOMES = 5;

/** Columna de cada nicho. Entre dos nichos siempre hay dos celdas de orilla. */
export const HOME_COLS: readonly number[] = [1, 4, 7, 10, 13];

/** Columna de la acera desde la que sale la rana. */
export const START_COL = 7;

// ── Puntuación ───────────────────────────────────────────────────────────────

/** Todo entero: `public.scores.score` lo es. */
export const POINTS_ROW = 10; // por fila nueva de la travesía
export const POINTS_HOME = 50; // por ocupar un nicho libre
export const POINTS_TIME = 10; // por segundo entero que sobra al llegar
export const POINTS_ROUND = 200; // por completar los cinco nichos
export const POINTS_FLY = 200; // por entrar en el nicho con la mosca
export const POINTS_LADY = 200; // por llegar a casa escoltando a la dama-rana

// ── Cronómetro ───────────────────────────────────────────────────────────────

/**
 * Segundos por travesía. No es una cuarta cifra del HUD: se pinta como barra en
 * el canvas, bajo la fila de casas, que es la novena regla del contrato de
 * motor —del HUD de un original sólo sobrevive lo que no tiene equivalente
 * fuera—.
 */
export const TIME_START = 30;
export const TIME_STEP = 2; // se acorta cada ronda
export const TIME_MIN = 20; // suelo: la ronda 6 ya no acorta más
export const TIME_LOW = 5; // desde aquí la barra cambia de color

// ── Progresión ───────────────────────────────────────────────────────────────

/**
 * Multiplicador de velocidad de los carriles, acumulado por ronda. Con tope:
 * sin él, la ronda 15 sería un muro y la partida acabaría por aritmética en vez
 * de por habilidad. A partir de ahí lo que sigue apretando es el cronómetro.
 */
export const SPEED_STEP = 1.12;
export const SPEED_MAX = 2.2; // se alcanza en la ronda 8 y ahí se queda

// ── Ritmos ───────────────────────────────────────────────────────────────────

export const HOP_MS = 110; // duración del salto animado, en milisegundos
export const DEATH_MS = 800; // la fase `"dead"` antes de reaparecer, en milisegundos

/** Ciclos de la fauna, en segundos. */
export const DIVE_CYCLE = 4.0; // ciclo completo de una tortuga
export const DIVE_DOWN = 1.2; // cuánto pasa sumergida al final del ciclo
export const DIVE_WARN = 0.5; // transparencia previa que la delata: sin aviso es una trampa
export const GATOR_CYCLE = 10.0; // ciclo del cocodrilo de las casas
export const GATOR_OPEN = 4.0; // cuánto asoma dentro de ese ciclo
export const FLY_EVERY = 12.0; // cada cuánto sale la mosca
export const FLY_LASTS = 5.0; // cuánto se queda
export const LADY_EVERY = 20.0; // cada cuánto sale la dama-rana

/** Fila del río en la que espera la dama-rana, montada en una plataforma. */
export const LADY_ROW = 3;

/** Píxeles por segundo de la serpiente de la mediana. */
export const SNAKE_SPEED = 60;

// ── Rondas de aparición ──────────────────────────────────────────────────────

/**
 * Ronda a partir de la cual aparece cada cosa. La 1 es limpia a propósito: así
 * la primera partida enseña el juego sin manual y cada ronda añade exactamente
 * una cosa.
 */
export const TRUCKS_FROM = 2;
export const DIVERS_FROM = 2;
export const LADY_FROM = 2;
export const GATOR_FROM = 3;
export const SNAKE_FROM = 3;

// ── Colisión ─────────────────────────────────────────────────────────────────

/**
 * Indulgencia de colisión, en píxeles por lado. Sin ella, rozar mata. Sólo vale
 * en carretera: en el río la regla es el centro de la rana, porque el error que
 * produce cada una es distinto —en carretera la injusticia es morir sin tocar;
 * en el río, ahogarse pareciendo estar encima—.
 */
export const HIT_PAD = 6;

/**
 * Lo que tiene que quedar de la rana sobre una plataforma para que la sostenga,
 * en píxeles a cada lado. Con 10, se apoya mientras la plataforma cubra algo de
 * su franja central de 20.
 *
 * La spec pedía el **centro exacto**, sin ninguna tolerancia, y en la pantalla
 * eso se juega mal: el salto dura `HOP_MS`, la plataforma deriva de 8 a 14 px
 * mientras la rana vuela, y aterrizar con medio cuerpo encima —pero el centro
 * un píxel fuera— se leía como caerse de un tronco en el que estabas. Es la
 * indulgencia simétrica a la que `HIT_PAD` ya daba en la carretera.
 */
export const RIDE_PAD = 10;

// ── Colores ──────────────────────────────────────────────────────────────────

export const COLOR_ROAD = "#0a0a0f";
export const COLOR_LANE_LINE = "rgba(255,0,110,0.16)";
export const COLOR_WATER = "rgba(0,245,255,0.10)";
export const COLOR_BANK = "#ff006e";
export const COLOR_CAR = "#ff006e";
export const COLOR_TRUCK = "rgba(255,0,110,0.7)";
export const COLOR_LOG = "#00f5ff";
export const COLOR_TURTLE = "rgba(0,245,255,0.75)";
export const COLOR_TURTLE_DIVING = "rgba(0,245,255,0.25)";
export const COLOR_FROG = "#f5ff00";
export const COLOR_LADY = "#ff006e";
export const COLOR_GATOR = "rgba(245,255,0,0.85)";
export const COLOR_HOME = "rgba(0,245,255,0.45)";
export const COLOR_TIMER = "#f5ff00";
export const COLOR_TIMER_LOW = "#ff006e";
