/**
 * Tetris: el motor completo, cumpliendo el contrato de `lib/games/engine.ts`.
 *
 * Es el Tetris clásico de `references/started-games/03-tetris/`: siete
 * tetrominós, rotación horaria con desplazamiento contra la pared, proyección
 * de aterrizaje, retardo de bloqueo y la curva de velocidad del original. Todo
 * lo demás de aquel archivo —modos, power-ups, habilidades, skins, audio— se
 * quedó fuera a propósito.
 *
 * Todo el estado de partida vive dentro del closure de `mount()`. En el ámbito
 * de módulo no hay ni una variable mutable: montar el juego dos veces crea dos
 * partidas independientes, y destruirlo no deja nada detrás.
 *
 * El bucle es `requestAnimationFrame` a pelo, fuera de React. Nunca provoca un
 * render: los únicos avisos hacia arriba son `onState` —solo cuando cambia
 * alguna de las tres cifras del HUD— y `onGameOver`. Con Tetris eso importa más
 * que con Asteroids, porque hay frames enteros en los que no cambia nada.
 */

import type { GameCallbacks, GameHandle, GameMount, GameState } from "@/lib/games/engine";
import { createInput } from "@/lib/games/input";
import { QUEUE_MAX, WORLD } from "@/lib/games/tetris/constants";
import { createBoard, type Board } from "@/lib/games/tetris/board";
import { randomPiece, type Piece } from "@/lib/games/tetris/pieces";

/** El estado de partida entero. Una instancia por `mount()`. */
interface Run {
  board: Board;
  current: Piece;
  /** Piezas precalculadas. `queue[0]` es la siguiente. */
  queue: Piece[];
  score: number;
  lines: number;
  level: number;
  /** Milisegundos acumulados hacia la siguiente caída por gravedad. */
  dropAccum: number;
  dropInterval: number;
  /** Lock delay de la pieza activa. `> 0` significa "apoyada". */
  lockTimer: number;
  lockResets: number;
  /** Repetición al mantener: ms que lleva abajo cada tecla de movimiento. */
  held: { ArrowLeft: number; ArrowRight: number; ArrowDown: number };
  /** Máquina de estados interna. No confundir con el `GameState` del HUD. */
  phase: "playing" | "gameover";
}

/** Nunca más de 50 ms por frame, para que una pestaña oculta no vacíe el tablero. */
const MAX_DT = 50;

/** La curva del original: cada nivel resta 90 ms, con un suelo de 100. */
function levelToDropInterval(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 90);
}

export const tetrisGame: GameMount = {
  world: WORLD,
  hud: ["PUNTUACION", "LINEAS", "NIVEL"],

  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle {
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("Tetris: el canvas no da contexto 2D.");
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
      const queue: Piece[] = [];
      fillQueue(queue);
      return {
        board: createBoard(),
        current: randomPiece(),
        queue,
        score: 0,
        lines: 0,
        level: 1,
        dropAccum: 0,
        dropInterval: levelToDropInterval(1),
        lockTimer: 0,
        lockResets: 0,
        held: { ArrowLeft: 0, ArrowRight: 0, ArrowDown: 0 },
        phase: "playing",
      };
    }

    /** Rellena la cola hasta `QUEUE_MAX`. Solo añade por el final. */
    function fillQueue(queue: Piece[]) {
      while (queue.length < QUEUE_MAX) queue.push(randomPiece());
    }

    // ── Frontera con React ───────────────────────────────────────────────────

    function emitState() {
      if (
        emitted &&
        emitted.score === run.score &&
        emitted.lives === run.lines &&
        emitted.level === run.level
      ) {
        return;
      }
      // La cifra del medio del contrato son las líneas, no vidas: Tetris no
      // tiene. Por eso el HUD lee sus rótulos del motor.
      emitted = { score: run.score, lives: run.lines, level: run.level };
      cb.onState(emitted);
    }

    // ── Simulación y dibujo ──────────────────────────────────────────────────

    function update(dt: number) {
      // La entrada, la gravedad, el lock delay y el spawn llegan en el paso 4.
      run.dropAccum += dt;
    }

    function draw() {
      // El tablero, la pieza y la banda derecha llegan en el paso 5.
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }

    // ── Bucle ────────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
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
      // Sin listeners no llega el `keyup`, así que la repetición al mantener se
      // olvida aquí: si no, al reanudar la pieza saldría disparada de lado.
      run.held.ArrowLeft = 0;
      run.held.ArrowRight = 0;
      run.held.ArrowDown = 0;
    }

    // El HUD estrena las cifras de verdad en cuanto existe el canvas, sin
    // esperar a `start()`: hasta entonces React pinta su `FRESH_RUN`, que vale
    // tres vidas y aquí serían tres líneas que nadie ha hecho.
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
