/**
 * Constantes de Arkanoid, copiadas de
 * `references/started-games/04-arkanoid/` sin cambiar un número.
 *
 * El original está equilibrado y la curva entera —velocidad base de cada
 * pantalla, tope, aceleración, ángulo máximo de rebote, densidad de las diez
 * rejillas— sale de estos valores. Su propio comentario avisa de que el tope de
 * velocidad es «conservador para evitar tunneling»: retocarlo sin jugarlo es
 * exactamente cómo se rompe este juego.
 *
 * La mayoría vienen de `src/config.js`. Las tres que no: la geometría de la
 * rejilla vive en `src/levels.js`, `MAX_BOUNCE_ANGLE` en `src/collision.js` y
 * `LEVEL_CLEAR_TIME` en `src/main.js`. Ninguna cambia de valor al mudarse aquí.
 *
 * Lo que no entra: nada del spritesheet. El original no dibuja ni una primitiva
 * —paddle, bola, bloques y explosiones son recortes de un PNG—, y aquí todo se
 * redibuja con `fillRect` y `arc`.
 *
 * Los colores ya no están aquí: viven en `skins.ts`, que tiene los del original
 * —los siete nombres de color CSS de la tabla de bloques, copiados literales— y
 * los de las otras dos pieles. Aquí sólo quedan números y el vocabulario de
 * celdas de la rejilla, que es geometría de nivel y no color.
 */

// ── Mundo ────────────────────────────────────────────────────────────────────

/**
 * El mundo lógico del original, que es también el de Asteroids. Su proporción
 * de 1,33 es aquella para la que se calibró el marco de `PlayCabinet`.
 */
export const WORLD = { width: 800, height: 600 };

// ── Reglas ───────────────────────────────────────────────────────────────────

export const INITIAL_LIVES = 3;

/** Puntos por bloque roto. Los grises irrompibles no suman. */
export const SCORE_PER_BLOCK = 100;

/** Duración (s) de la transición entre niveles. De `src/main.js`. */
export const LEVEL_CLEAR_TIME = 1.2;

// ── Velocidad de la bola ─────────────────────────────────────────────────────

/**
 * La velocidad parte de `LEVELS[i].baseSpeed` y crece gradualmente hasta el tope
 * del nivel. Tope y crecimiento escalan con el nivel (fórmula lineal sobre el
 * `levelIndex` 0-based); el valor del nivel 1 coincide con las constantes
 * originales del MVP del que salió el juego.
 */
export const BALL_MAX_SPEED_BASE = 460; // tope del nivel 1 (px/s) — conservador para evitar tunneling
export const BALL_MAX_SPEED_STEP = 15; // +px/s de tope por nivel
export const BALL_SPEED_GROWTH_BASE = 6; // crecimiento del nivel 1 (px/s por segundo de juego)
export const BALL_SPEED_GROWTH_STEP = 1; // +px/s² por nivel

export const maxSpeedForLevel = (i: number): number =>
  BALL_MAX_SPEED_BASE + BALL_MAX_SPEED_STEP * i;

export const growthForLevel = (i: number): number =>
  BALL_SPEED_GROWTH_BASE + BALL_SPEED_GROWTH_STEP * i;

/**
 * Ángulo máximo de salida del paddle respecto a la vertical, en los extremos.
 * 60° garantiza componente vertical mínima (cos 60° = 0,5) → la bola siempre
 * sube. De `src/collision.js`.
 */
export const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;

// ── Paddle y bola ────────────────────────────────────────────────────────────

/** `x` se calcula al centrar; el resto es literal de `src/state.js`. */
export const PADDLE = { y: 560, w: 162, h: 14, speed: 600 };

export const BALL_RADIUS = 8;

/** Reparto del lanzamiento entre los dos ejes, de `launchBall()`. */
export const LAUNCH_VX = 0.6;
export const LAUNCH_VY = 0.8;

// ── Rejilla de bloques ───────────────────────────────────────────────────────
// De `src/levels.js`, en coordenadas del mundo lógico.

/** Margen izq/der del área de bloques. */
export const SIDE_MARGIN = 40;
/** Separación desde el techo. */
export const TOP_MARGIN = 60;
/** Hueco horizontal entre bloques. */
export const GAP_X = 6;
/** Hueco vertical entre bloques. */
export const GAP_Y = 6;
/** Alto de cada bloque. Con diez columnas el ancho sale 66,6 px. */
export const BLOCK_H = 24;

// ── Tipos de bloque ──────────────────────────────────────────────────────────

/**
 * Las celdas con bloque que entiende la rejilla. Eran las claves de las dos
 * tablas de color del original —`COLOR_MAP` para las letras y `HP_COLOR` para
 * los dígitos—, y siguen siendo las mismas nueve ahora que el color se resuelve
 * al dibujar: aquí lo que queda es el vocabulario del nivel, no su aspecto.
 *
 * Las seis primeras letras son bloques de un golpe, `a` el gris irrompible y los
 * dígitos son los golpes que aguanta un bloque multi-golpe.
 */
export const BLOCK_KINDS = ["r", "y", "c", "m", "h", "g", "a", "2", "3"] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];

/** Celdas multi-golpe: el dígito es el número de golpes que aguantan. */
export const HP_KINDS: readonly BlockKind[] = ["2", "3"];

/** Letra de bloque irrompible (gris). */
export const UNBREAKABLE_LETTER = "a";

/** Si una celda de la rejilla lleva bloque. `.` y cualquier otra cosa, no. */
export function isBlockKind(cell: string): cell is BlockKind {
  return (BLOCK_KINDS as readonly string[]).includes(cell);
}

// ── Niveles ──────────────────────────────────────────────────────────────────

export interface Level {
  baseSpeed: number;
  rows: readonly string[];
}

/**
 * Cada nivel es una rejilla. `.` = hueco, letra = bloque de un golpe, dígito
 * `2`/`3` = bloque multi-golpe, `a` = gris irrompible; las nueve celdas con
 * bloque son `BLOCK_KINDS`. Todas las filas de todos los niveles usan diez
 * columnas.
 *
 * Entran los diez: son **el** contenido. Sin ellos Arkanoid son tres pantallas
 * planas que se acaban en dos minutos.
 */
export const LEVELS: readonly Level[] = [
  // 1–3 — sin cambios respecto al MVP
  {
    baseSpeed: 260,
    rows: ["rrrrrrrrrr", "yyyyyyyyyy", "cccccccccc"],
  },
  {
    baseSpeed: 290,
    rows: ["mmmmmmmmmm", "hhhhhhhhhh", "gggggggggg", "yyyyyyyyyy"],
  },
  {
    baseSpeed: 320,
    rows: ["r.r.r.r.r.", ".c.c.c.c.c", "mmmmmmmmmm", "gg.gggg.gg", "hhhhhhhhhh"],
  },

  // 4 — baseSpeed 340 · aparecen bloques de 2 golpes (cyan)
  {
    baseSpeed: 340,
    rows: ["2222222222", "rrrrrrrrrr", "yyyyyyyyyy"],
  },

  // 5 — baseSpeed 360 · más 2-golpes intercalados
  {
    baseSpeed: 360,
    rows: ["2.2.2.2.2.", ".2.2.2.2.2", "gggggggggg", "hhhhhhhhhh"],
  },

  // 6 — baseSpeed 380 · aparecen irrompibles (a, gris)
  {
    baseSpeed: 380,
    rows: ["aa......aa", "2222222222", "rrrrrrrrrr", "yyyyyyyyyy", "2222222222"],
  },

  // 7 — baseSpeed 400 · aparecen bloques de 3 golpes (magenta)
  {
    baseSpeed: 400,
    rows: ["3333333333", "22aa22aa22", "hhhhhhhhhh", "2222222222"],
  },

  // 8 — baseSpeed 420
  {
    baseSpeed: 420,
    rows: ["a.3.3.3.3a", "2233332222", "gggggggggg", "3333333333", "2222222222"],
  },

  // 9 — baseSpeed 440
  {
    baseSpeed: 440,
    rows: ["3a3a3a3a3a", "a3a3a3a3a3", "2222222222", "3333333333", "gggggggggg"],
  },

  // 10 — baseSpeed 460 · "jefe": denso, muchos 3-golpes e irrompibles
  {
    baseSpeed: 460,
    rows: ["a33333333a", "3322223333", "a2a2a2a2a2", "3333333333", "2222222222", "hhhhhhhhhh"],
  },
];
