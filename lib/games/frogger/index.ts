/**
 * Frogger: la quinta máquina del vault, y la segunda escrita desde cero.
 *
 * De las cinco, tres son puertos de `references/started-games/` —con su física
 * ya equilibrada y su tabla de puntos decidida por otro— y dos no: Snake, que al
 * menos traía un atlas de sprites, y ésta, que no traía nada. Así que el
 * equilibrio entero —celda de 40, treinta segundos por travesía que bajan a
 * veinte, ×1,12 de velocidad por ronda con tope en ×2,2, y las seis constantes
 * de puntuación— lo fija SPEC 14 y vive junto en `constants.ts` y `lanes.ts`.
 *
 * Dos cosas la separan de las otras cuatro:
 *
 * - **El cronómetro no es una cuarta cifra del HUD.** Las tres del contrato ya
 *   están dichas —puntuación, vidas y ronda—, así que el tiempo se pinta como
 *   una barra en el canvas, bajo la fila de casas. Es la misma excepción que
 *   usan las barras de potenciador de Asteroids: del HUD de un original sólo
 *   sobrevive lo que no tiene equivalente fuera.
 * - **No hay ni un `Math.random()`.** Los carriles, las tortugas que se
 *   sumergen, el cocodrilo, la mosca y la dama-rana son funciones de `run.t` y
 *   de la ronda, así que dos partidas de la misma ronda se juegan igual y una
 *   posición se reproduce en la consola sin montar el juego. La única entidad
 *   con estado propio es la serpiente de la mediana, porque rebota.
 *
 * Como en las otras cuatro, el ámbito de módulo no tiene ni una variable
 * mutable: todo el estado de partida vive en el closure de `mount()`.
 */

import {
  CELL,
  LIVES,
  ROW_START,
  START_COL,
  TIME_MIN,
  TIME_START,
  TIME_STEP,
  H,
  W,
} from "@/lib/games/frogger/constants";
import { Bonus, Frog, Homes, Lane, Snake } from "@/lib/games/frogger/entities";
import { lanesForRound } from "@/lib/games/frogger/lanes";
import type { GameCallbacks, GameHandle, GameMount, GameState } from "@/lib/games/engine";
import { createInput } from "@/lib/games/input";

/**
 * Estado de una partida.
 *
 * `phase` y no `state`: el `GameState` del contrato son las tres cifras del HUD,
 * y confundirlas es el error caro.
 */
interface Run {
  frog: Frog;
  lanes: Lane[];
  homes: Homes;
  snake: Snake | null;
  bonus: Bonus;
  /** Segundos desde que arrancó **la ronda**. Mueve carriles, tortugas y fauna. */
  t: number;
  /** Segundos que quedan de la travesía en curso. */
  time: number;
  score: number;
  lives: number;
  /** Ronda, desde 1. Es la tercera cifra del HUD. */
  round: number;
  /** Segundos restantes de la fase actual, cuando la fase tiene duración. */
  timer: number;
  /**
   * `"ready"` es la rana quieta en la acera con el cronómetro parado, esperando
   * `ESPACIO`: es la fase con la que empieza la partida y también cada vida
   * después de perder una. Con cronómetro, reaparecer en marcha es empezar a
   * perder antes de reaccionar. Llegar a casa **no** pasa por aquí: parar cinco
   * veces por ronda sería un peaje.
   */
  phase: "ready" | "playing" | "dead" | "gameover";
}

/** El `dt` del patrón del vault: nunca más de 0,05 s, para que una pestaña
 * oculta no teletransporte nada. */
const MAX_DT = 0.05;

/** Segundos de travesía en la ronda `round`: 30 en la 1, 20 desde la 6. */
function timeForRound(round: number): number {
  return Math.max(TIME_START - (round - 1) * TIME_STEP, TIME_MIN);
}

export const froggerGame: GameMount = {
  world: { width: W, height: H },
  hud: ["PUNTUACION", "VIDAS", "NIVEL"],

  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle {
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("Frogger: el canvas no da contexto 2D.");
    // Con tipo declarado: el estrechamiento del `throw` no llega solo hasta las
    // funciones de dibujo, que están declaradas más abajo.
    const ctx: CanvasRenderingContext2D = context2d;

    const input = createInput();

    let run = createRun();
    let frame: number | null = null;
    let lastTime: number | null = null;
    let running = false;
    let destroyed = false;
    /** Última terna emitida, para no avisar en frames donde nada cambió. */
    let emitted: GameState | null = null;
    /** `onGameOver` se avisa una sola vez por partida. */
    let overSent = false;

    // ── Construcción del estado ──────────────────────────────────────────────

    function createRun(): Run {
      return {
        frog: new Frog(START_COL * CELL, ROW_START),
        lanes: lanesForRound(1).map((spec) => new Lane(spec)),
        homes: new Homes(),
        // La serpiente no existe hasta `SNAKE_FROM`; la ronda 1 es limpia.
        snake: null,
        bonus: new Bonus(),
        t: 0,
        time: timeForRound(1),
        score: 0,
        lives: LIVES,
        round: 1,
        timer: 0,
        phase: "ready",
      };
    }

    // ── Frontera con React ───────────────────────────────────────────────────

    function emitState() {
      if (
        emitted &&
        emitted.score === run.score &&
        emitted.lives === run.lives &&
        emitted.level === run.round
      ) {
        return;
      }
      emitted = { score: run.score, lives: run.lives, level: run.round };
      cb.onState(emitted);
    }

    // ── Simulación ───────────────────────────────────────────────────────────

    function update(dt: number) {
      run.t += dt;
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────

    function draw() {
      ctx.clearRect(0, 0, W, H);
    }

    // ── Bucle ────────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
      lastTime = ts;
      update(dt);
      draw();
      emitState();
      // Después de `emitState()`: el superpuesto de fin de partida se abre con
      // el HUD ya cuadrado, no una cifra por detrás.
      if (run.phase === "gameover" && !overSent) {
        overSent = true;
        cb.onGameOver(run.score);
      }
      // `running` puede haberse apagado dentro de `update()` al terminar la
      // partida: en ese caso no se pide otro frame.
      frame = running ? requestAnimationFrame(loop) : null;
    }

    /** Arranca o reanuda el bucle. El `dt` del primer frame vuelve a ser 0. */
    function play() {
      if (destroyed || running) return;
      running = true;
      lastTime = null;
      input.attach();
      frame = requestAnimationFrame(loop);
    }

    /** Detiene el bucle y suelta el teclado, sin tocar el estado de partida. */
    function halt() {
      running = false;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      input.detach();
    }

    // El HUD estrena las cifras de verdad en cuanto existe el canvas, sin
    // esperar a `start()`, para que el `FRESH_RUN` de `PlayCabinet` no se vea
    // durante los 750 ms de `CARGANDO CARTUCHO`.
    emitState();

    return {
      start() {
        emitState();
        draw();
        play();
      },

      pause() {
        halt();
      },

      resume() {
        play();
      },

      restart() {
        halt();
        run = createRun();
        overSent = false;
        emitState();
        draw();
        play();
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        halt();
      },

      // El mando táctil entra por la misma puerta que el teclado.
      press(code) {
        input.press(code);
      },

      release(code) {
        input.release(code);
      },
    };
  },
};
