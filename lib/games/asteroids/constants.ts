/**
 * Constantes de Asteroids, copiadas de
 * `references/started-games/02-asteroids/game.js` sin cambiar un número.
 *
 * El juego original está equilibrado: retocar un valor «de paso» —la duración
 * de un power-up, una probabilidad de drop, el rozamiento— lo desafina. Si algo
 * hay que ajustar es la tabla de semillas de `lib/scores.ts`, nunca esto.
 */

/** Mundo lógico. El canvas se escala; estas dos cifras no cambian. */
export const W = 800;
export const H = 600;

/** Radio, velocidad base y puntos por tamaño de asteroide (1, 2, 3). */
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];

// ── Power-up: Disparo Triple ─────────────────────────────────────────────────
/** Segundos que dura el efecto. */
export const TRIPLE_DURATION = 10;
/** rad (~15°) de separación entre balas del abanico. */
export const TRIPLE_SPREAD = 0.26;
/** Cian, color del power-up Disparo Triple. */
export const PU_COLOR = "#0ff";

// ── Power-up: Escudo ─────────────────────────────────────────────────────────
export const SHIELD_DURATION = 5;
/** Azul claro. */
export const SHIELD_COLOR = "#8cf";

// ── Power-up: Cámara lenta ───────────────────────────────────────────────────
export const SLOW_DURATION = 6;
/** Asteroides a mitad de velocidad durante el efecto. */
export const SLOW_FACTOR = 0.5;
/** Ámbar. */
export const SLOW_COLOR = "#fd4";

// ── Power-up: Hiperpropulsión ────────────────────────────────────────────────
export const HYPER_DURATION = 8;
/** Multiplica la aceleración de la nave. */
export const HYPER_THRUST_MULT = 2.4;
/** Giro un poco más ágil. */
export const HYPER_ROT_MULT = 1.3;
/** Menos fricción => mayor velocidad máxima. */
export const HYPER_DRAG = 0.994;
/** Rozamiento normal de la nave, fuera de hiperpropulsión. */
export const SHIP_DRAG = 0.987;
/** Verde. */
export const HYPER_COLOR = "#5f8";

// ── Power-up: Bomba Nova ─────────────────────────────────────────────────────
/** Probabilidad baja de drop: es el ítem escaso, máx. uno por nivel. */
export const NOVA_CHANCE = 0.04;
/** Rojo. */
export const NOVA_COLOR = "#f55";

// ── Drops ────────────────────────────────────────────────────────────────────
/** Probabilidad de drop al destruir un asteroide. */
export const DROP_CHANCE = 0.15;
/** Fuerza el drop si no cayó en las primeras N destrucciones del nivel. */
export const DROP_GUARANTEE = 6;
/** Cuántos tipos del pool aparecen (1 c/u) por nivel, al azar. */
export const TYPES_PER_LEVEL = 2;

export type PowerUpType = "triple" | "shield" | "slow" | "hyper" | "nova";

/** Tipos del pool rotativo. `nova` queda fuera: cae por su cuenta y sin garantía. */
export const ALL_PU_TYPES: readonly PowerUpType[] = ["triple", "shield", "slow", "hyper"];
