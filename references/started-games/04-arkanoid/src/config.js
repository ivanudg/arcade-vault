// Configuración y datos estáticos del juego.
// Todo en coordenadas del MUNDO LÓGICO fijo (ver WORLD); el render escala al canvas real.

// --- Mundo lógico ---
export const WORLD = { w: 800, h: 600 };

// --- Vidas iniciales ---
export const INITIAL_LIVES = 3;

// --- Velocidad de la bola ---
// La velocidad parte de LEVELS[i].baseSpeed y crece gradualmente hasta el tope del nivel.
// El tope y el crecimiento escalan con el nivel (fórmula lineal sobre levelIndex 0-based);
// el valor del nivel 1 (index 0) coincide con las constantes originales del MVP.
export const BALL_MAX_SPEED_BASE = 460; // tope del nivel 1 (px/s) — conservador para evitar tunneling
export const BALL_MAX_SPEED_STEP = 15; // +px/s de tope por nivel
export const BALL_SPEED_GROWTH_BASE = 6; // crecimiento del nivel 1 (px/s por segundo de juego)
export const BALL_SPEED_GROWTH_STEP = 1; // +px/s² por nivel

export const maxSpeedForLevel = (i) =>
  BALL_MAX_SPEED_BASE + BALL_MAX_SPEED_STEP * i;
export const growthForLevel = (i) =>
  BALL_SPEED_GROWTH_BASE + BALL_SPEED_GROWTH_STEP * i;

// --- Puntos por bloque roto ---
export const SCORE_PER_BLOCK = 100;

// --- Mapa de letra → nombre de color del spritesheet ---
export const COLOR_MAP = {
  r: "red",
  y: "yellow",
  c: "cyan",
  m: "magenta",
  h: "hotpink",
  g: "green",
  a: "gray",
};

// --- Color de sprite EXCLUSIVO para los bloques multi-golpe, por número de golpes (HP) ---
// El desgaste se muestra con alpha; el color base es fijo por tipo.
// cyan y magenta no se usan como bloques de 1 golpe en los niveles 4–10.
export const HP_COLOR = {
  2: "cyan", // bloque de 2 golpes
  3: "magenta", // bloque de 3 golpes
};

// Letra de bloque irrompible (gris). Ya existe en COLOR_MAP ('a' → "gray").
export const UNBREAKABLE_LETTER = "a";

// --- Definición de niveles ---
// Cada nivel es una rejilla. '.' = hueco, letra = bloque de 1 golpe (COLOR_MAP),
// dígito '2'/'3' = bloque multi-golpe (HP_COLOR), 'a' = gris irrompible.
// Todas las filas de todos los niveles usan 10 columnas (ancho del mundo lógico).
export const LEVELS = [
  // 1–3 — sin cambios respecto al MVP
  {
    baseSpeed: 260,
    rows: [
      "rrrrrrrrrr",
      "yyyyyyyyyy",
      "cccccccccc",
    ],
  },
  {
    baseSpeed: 290,
    rows: [
      "mmmmmmmmmm",
      "hhhhhhhhhh",
      "gggggggggg",
      "yyyyyyyyyy",
    ],
  },
  {
    baseSpeed: 320,
    rows: [
      "r.r.r.r.r.",
      ".c.c.c.c.c",
      "mmmmmmmmmm",
      "gg.gggg.gg",
      "hhhhhhhhhh",
    ],
  },

  // 4 — baseSpeed 340 · aparecen bloques de 2 golpes (cyan)
  {
    baseSpeed: 340,
    rows: [
      "2222222222",
      "rrrrrrrrrr",
      "yyyyyyyyyy",
    ],
  },

  // 5 — baseSpeed 360 · más 2-golpes intercalados
  {
    baseSpeed: 360,
    rows: [
      "2.2.2.2.2.",
      ".2.2.2.2.2",
      "gggggggggg",
      "hhhhhhhhhh",
    ],
  },

  // 6 — baseSpeed 380 · aparecen irrompibles (a, gris)
  {
    baseSpeed: 380,
    rows: [
      "aa......aa",
      "2222222222",
      "rrrrrrrrrr",
      "yyyyyyyyyy",
      "2222222222",
    ],
  },

  // 7 — baseSpeed 400 · aparecen bloques de 3 golpes (magenta)
  {
    baseSpeed: 400,
    rows: [
      "3333333333",
      "22aa22aa22",
      "hhhhhhhhhh",
      "2222222222",
    ],
  },

  // 8 — baseSpeed 420
  {
    baseSpeed: 420,
    rows: [
      "a.3.3.3.3a",
      "2233332222",
      "gggggggggg",
      "3333333333",
      "2222222222",
    ],
  },

  // 9 — baseSpeed 440
  {
    baseSpeed: 440,
    rows: [
      "3a3a3a3a3a",
      "a3a3a3a3a3",
      "2222222222",
      "3333333333",
      "gggggggggg",
    ],
  },

  // 10 — baseSpeed 460 · "jefe": denso, muchos 3-golpes e irrompibles
  {
    baseSpeed: 460,
    rows: [
      "a33333333a",
      "3322223333",
      "a2a2a2a2a2",
      "3333333333",
      "2222222222",
      "hhhhhhhhhh",
    ],
  },
];
