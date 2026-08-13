/**
 * Contrato entre un motor de juego y la pantalla que lo enseña.
 *
 * Un motor es TypeScript puro: no importa `react` ni `next` y su bucle corre a
 * 60 fps fuera del ciclo de render. La única frontera con React son los dos
 * callbacks de `GameCallbacks` y los métodos imperativos de `GameHandle`.
 *
 * Para añadir un motor nuevo: implementar `GameMount` y registrarlo en
 * `lib/games/engines.ts`.
 */

import type { SkinId } from "./skins";

/** Tamaño lógico del mundo. El gabinete lo usa para el `aspect-ratio`. */
export interface GameWorld {
  width: number;
  height: number;
}

/** Las tres cifras del HUD. Se emiten solo cuando alguna cambia. */
export interface GameState {
  score: number;
  lives: number;
  level: number;
}

export interface GameCallbacks {
  onState: (state: GameState) => void;
  onGameOver: (score: number) => void;
}

export interface GameHandle {
  start(): void;
  pause(): void;
  resume(): void;
  /** Reinicia desde cero: puntuación a 0, tres vidas, nivel 1. */
  restart(): void;
  /** Suelta el bucle y los listeners. Llamarlo dos veces no rompe nada. */
  destroy(): void;
  /**
   * Mantiene una tecla desde el mando táctil, como si viniera del teclado.
   * La entrada del motor vive en su closure, así que ésta es la vía por la que
   * el gabinete inyecta los botones en pantalla.
   */
  press(code: string): void;
  /** Suelta una tecla inyectada con `press()`. */
  release(code: string): void;
  /**
   * Cambia la piel en caliente, sin tocar la partida en curso.
   *
   * Opcional a propósito: un motor sin vestir no la tiene, y el gabinete pinta
   * su selector deshabilitado en vez de romper. El día que las cuatro máquinas
   * estén vestidas, deja de tener sentido que sea opcional.
   */
  setSkin?(id: SkinId): void;
}

/** Lo que implementa cada juego. `world` es estático, no depende del canvas. */
export interface GameMount {
  world: GameWorld;
  /**
   * Rótulos del HUD, en el orden score/lives/level. MAYÚSCULAS y sin tildes.
   *
   * Requerido, sin valor por defecto: las tres cifras son las mismas para todos
   * los motores, pero no significan lo mismo —la del medio son vidas en
   * Asteroids y líneas en Tetris—, así que `tsc` obliga a cada uno a decidir en
   * vez de heredar en silencio unos rótulos que podrían mentir en pantalla.
   */
  hud: readonly [string, string, string];
  /**
   * Las pieles que este motor sabe pintar. Ausente mientras no esté vestido:
   * es lo que el gabinete mira para saber si enciende el selector, y lo mira
   * antes de montar nada, porque `GameMount` es estático.
   *
   * `mount()` no cambia de firma: el gabinete llama a `setSkin()` en cuanto
   * recibe el handle, y la partida no arranca hasta que termina el superpuesto
   * de carga, así que no hay ni un frame con el color equivocado.
   */
  skins?: readonly SkinId[];
  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle;
}
