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
 * redibuja con `fillRect` y `arc`. Los siete nombres de `COLOR_MAP` son los
 * siete nombres de color CSS válidos, así que la tabla se copia literal y pasa a
 * ser `fillStyle` directo.
 */

// ── Mundo ────────────────────────────────────────────────────────────────────

/**
 * El mundo lógico del original, que es también el de Asteroids. Su proporción
 * de 1,33 es aquella para la que se calibró el marco de `PlayCabinet`.
 */
export const WORLD = { width: 800, height: 600 };

/** El `#12122b` del área de juego del original. Sus bandas de letterbox no
 * entran: `GameCanvas` no deja bandas. */
export const BACKGROUND = "#12122b";

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

// ── Colores ──────────────────────────────────────────────────────────────────

/**
 * Letra de la rejilla → color. En el original era el nombre del recorte del
 * spritesheet; aquí es el `fillStyle`, porque los siete son nombres de color CSS
 * válidos y no hubo que inventar ni un hexadecimal.
 *
 * El neón del vault no repinta nada: mismo criterio que dejó a Asteroids en
 * vectores blancos y a Tetris con sus siete colores. El neón lo pone el
 * gabinete, no el juego.
 */
export const COLOR_MAP: Readonly<Record<string, string>> = {
  r: "red",
  y: "yellow",
  c: "cyan",
  m: "magenta",
  h: "hotpink",
  g: "green",
  a: "gray",
};

/**
 * Color exclusivo de los bloques multi-golpe, por número de golpes. El desgaste
 * se muestra con alpha; el color base es fijo por tipo. `cyan` y `magenta` no se
 * usan como bloques de un golpe en los niveles 4–10.
 */
export const HP_COLOR: Readonly<Record<string, string>> = {
  2: "cyan", // bloque de 2 golpes
  3: "magenta", // bloque de 3 golpes
};

/** Letra de bloque irrompible (gris). Ya existe en `COLOR_MAP`. */
export const UNBREAKABLE_LETTER = "a";

// ── Niveles ──────────────────────────────────────────────────────────────────

export interface Level {
  baseSpeed: number;
  rows: readonly string[];
}

/**
 * Cada nivel es una rejilla. `.` = hueco, letra = bloque de un golpe
 * (`COLOR_MAP`), dígito `2`/`3` = bloque multi-golpe (`HP_COLOR`), `a` = gris
 * irrompible. Todas las filas de todos los niveles usan diez columnas.
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
