/**
 * Arkanoid: la tercera máquina del vault.
 *
 * Puerto de `references/started-games/04-arkanoid/`, que era once módulos ES con
 * el estado repartido en variables de módulo. Aquí todo el estado de partida
 * vive dentro del closure de `mount()` y el ámbito de módulo no tiene ni una
 * variable mutable, como en los otros dos motores.
 *
 * Lo que del original no cruza:
 *
 * - **El spritesheet.** Paddle, bola y bloques se redibujan con `fillRect` y
 *   `arc` (ver `entities.ts`), y con él se caen las explosiones de cuatro
 *   frames, que eran recortes del mismo PNG.
 * - **El HUD, las pantallas y el menú de pausa.** La puntuación, las vidas, el
 *   nivel, el `GAME OVER` y la pausa los pinta React a veinte píxeles del
 *   canvas; el motor solo sube las tres cifras por `onState`.
 * - **El ratón.** `lib/games/input.ts` solo sabe de teclado, así que el paddle
 *   se mueve con `←` y `→`, que el original ya traía de control alternativo.
 * - **El audio.** Los dos `.mp3` esperan a su propia spec, que cubrirá las tres
 *   máquinas a la vez.
 *
 * Y lo que gana: `ESPACIO` lanza la bola. El original la auto-relanzaba tras
 * cada vida perdida; aquí queda apoyada sobre el paddle y espera, como en el
 * Arkanoid de 1986 y como en la pantalla de inicio del propio original.
 */

import type { GameCallbacks, GameHandle, GameMount, GameState } from "@/lib/games/engine";
import { createInput } from "@/lib/games/input";
import { INITIAL_LIVES, LEVELS, WORLD } from "./constants";
import {
  centerPaddle,
  createBall,
  createPaddle,
  restBallOnPaddle,
  type Ball,
  type Paddle,
} from "./entities";
import { buildLevel, type Block } from "./levels";

/**
 * Estado de una partida.
 *
 * `phase` y no `state`: el `GameState` del contrato son las tres cifras del HUD,
 * y confundirlas es el error caro. Son cuatro fases donde el original tenía
 * seis, porque tres de las suyas —la pantalla de inicio, la pausa y la
 * victoria— las resuelve el gabinete.
 */
interface Run {
  paddle: Paddle;
  ball: Ball;
  blocks: Block[];
  score: number;
  lives: number;
  /** 0-based. El HUD enseña `levelIndex + 1`. */
  levelIndex: number;
  /** Cuenta atrás de la transición entre niveles, en segundos. */
  clearTimer: number;
  phase: "serve" | "playing" | "levelclear" | "gameover";
}

/** El `dt` del patrón del vault: nunca más de 0,05 s, para que una pestaña
 * oculta no teletransporte nada. El original acotaba en 1/30. */
const MAX_DT = 0.05;

export const arkanoidGame: GameMount = {
  world: { width: WORLD.width, height: WORLD.height },
  hud: ["PUNTUACION", "VIDAS", "NIVEL"],

  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle {
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("Arkanoid: el canvas no da contexto 2D.");
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
      const paddle = createPaddle();
      const ball = createBall();
      centerPaddle(paddle);
      ball.speed = LEVELS[0].baseSpeed;
      restBallOnPaddle(ball, paddle);

      return {
        paddle,
        ball,
        blocks: buildLevel(0),
        score: 0,
        lives: INITIAL_LIVES,
        levelIndex: 0,
        clearTimer: 0,
        phase: "serve",
      };
    }

    // ── Frontera con React ───────────────────────────────────────────────────

    function emitState() {
      const level = run.levelIndex + 1;
      if (
        emitted &&
        emitted.score === run.score &&
        emitted.lives === run.lives &&
        emitted.level === level
      ) {
        return;
      }
      emitted = { score: run.score, lives: run.lives, level };
      cb.onState(emitted);
    }

    // ── Simulación ───────────────────────────────────────────────────────────

    function update(_dt: number) {
      // Las cuatro fases entran en el paso siguiente.
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────

    function draw() {
      // El tablero entra en el paso siguiente.
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
    // esperar a `start()`. Aquí el `FRESH_RUN` de `PlayCabinet` acertaría por
    // casualidad —vale 0 / 3 / 1—, y aun así se emite: cumplir el contrato solo
    // cuando hace falta es cómo se rompe la máquina siguiente.
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
