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
import { INITIAL_LIVES, LEVELS, LEVEL_CLEAR_TIME, SCORE_PER_BLOCK, WORLD } from "./constants";
import {
  ballVsBlocks,
  ballVsPaddle,
  centerPaddle,
  createBall,
  createPaddle,
  launchBall,
  restBallOnPaddle,
  updateBall,
  updatePaddle,
  type Ball,
  type Paddle,
} from "./entities";
import { buildLevel, remainingBlocks, type Block } from "./levels";

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

    // ── Sucesos de partida ───────────────────────────────────────────────────

    /**
     * La bola cayó bajo el paddle. Si quedan vidas, la siguiente sale apoyada y
     * esperando `ESPACIO`; el original la auto-relanzaba.
     *
     * `ball.speed` no se reinicia, como en el original: la velocidad acumulada
     * durante el nivel se conserva al perder una vida.
     */
    function loseLife(r: Run) {
      r.lives -= 1;
      if (r.lives <= 0) {
        r.lives = 0;
        r.phase = "gameover";
        r.ball.vx = 0;
        r.ball.vy = 0;
        // El original volvía a su pantalla de inicio; aquí manda React, así que
        // el bucle se detiene y el aviso sale al final de este frame.
        halt();
        return;
      }
      centerPaddle(r.paddle);
      restBallOnPaddle(r.ball, r.paddle);
      r.phase = "serve";
    }

    /**
     * Monta la pantalla siguiente, o acaba la partida si la despejada era la
     * décima. El contrato no distingue ganar de perder: el jugador que despeje
     * la última ve el mismo fin de partida, con su puntuación.
     */
    function advanceLevel(r: Run) {
      if (r.levelIndex >= LEVELS.length - 1) {
        r.phase = "gameover";
        halt();
        return;
      }
      r.levelIndex += 1;
      r.blocks = buildLevel(r.levelIndex);
      r.ball.speed = LEVELS[r.levelIndex].baseSpeed;
      centerPaddle(r.paddle);
      restBallOnPaddle(r.ball, r.paddle);
      r.phase = "serve";
    }

    // ── Simulación ───────────────────────────────────────────────────────────

    function update(dt: number) {
      const r = run;

      if (r.phase === "gameover") return;

      // La bola descansa sobre el paddle y le sigue hasta que `ESPACIO` la
      // lanza. Es la fase que se lleva la pantalla de inicio del original y el
      // auto-relanzamiento de `loseLife()`.
      if (r.phase === "serve") {
        updatePaddle(r.paddle, input, dt);
        restBallOnPaddle(r.ball, r.paddle);
        if (input.pressed("Space")) {
          launchBall(r.ball);
          r.phase = "playing";
        }
        return;
      }

      // Transición entre pantallas: la bola está parada y el tablero despejado
      // sigue a la vista.
      if (r.phase === "levelclear") {
        r.clearTimer -= dt;
        if (r.clearTimer <= 0) advanceLevel(r);
        return;
      }

      updatePaddle(r.paddle, input, dt);
      updateBall(r.ball, dt, r.levelIndex);
      ballVsPaddle(r.ball, r.paddle);
      if (ballVsBlocks(r.ball, r.blocks).broke) r.score += SCORE_PER_BLOCK;

      // Caída bajo el paddle. El `return` es la única desviación de la lógica
      // del original, que seguía comprobando el despeje después de perder la
      // vida: con el último bloque roto y la última vida perdida en el mismo
      // frame, la transición de nivel pisaba el fin de partida y `onGameOver`
      // no llegaba a emitirse nunca.
      if (r.ball.y - r.ball.r > WORLD.height) {
        loseLife(r);
        return;
      }

      // Pantalla despejada. Los grises no cuentan, así que un nivel con
      // irrompibles se despeja con ellos todavía en pantalla.
      if (remainingBlocks(r.blocks) === 0) {
        r.phase = "levelclear";
        r.ball.vx = 0;
        r.ball.vy = 0;
        r.clearTimer = LEVEL_CLEAR_TIME;
      }
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
