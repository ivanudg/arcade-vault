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
import {
  ARR_MS,
  DAS_MS,
  KICKS,
  LINE_SCORES,
  LOCK_DELAY_MS,
  LOCK_RESET_MAX,
  QUEUE_MAX,
  WORLD,
} from "@/lib/games/tetris/constants";
import {
  clearLines,
  collide,
  createBoard,
  ghostY,
  merge,
  type Board,
} from "@/lib/games/tetris/board";
import { randomPiece, rotateCW, type Piece } from "@/lib/games/tetris/pieces";

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

    // ── Sucesos de partida ───────────────────────────────────────────────────

    /**
     * Rotar o mover una pieza ya apoyada le devuelve el medio segundo entero,
     * con un tope por pieza: sin él, girar sin parar pospone el bloqueo para
     * siempre.
     */
    function resetLockTimer() {
      const r = run;
      if (r.lockTimer <= 0) return;
      if (r.lockResets >= LOCK_RESET_MAX) return;
      r.lockResets++;
      r.lockTimer = 0;
    }

    /** Rotación horaria, probando los cinco desplazamientos de `KICKS`. */
    function tryRotate() {
      const r = run;
      const rotated = rotateCW(r.current.shape);
      for (const kick of KICKS) {
        if (!collide(r.board, rotated, r.current.x + kick, r.current.y)) {
          r.current.shape = rotated;
          r.current.x += kick;
          resetLockTimer();
          return;
        }
      }
    }

    /** Una columna a la izquierda o a la derecha, si cabe. */
    function move(dx: number) {
      const r = run;
      if (collide(r.board, r.current.shape, r.current.x + dx, r.current.y)) return;
      r.current.x += dx;
      resetLockTimer();
    }

    /** `↓`: una fila y un punto. Contra el suelo, consolida en el acto. */
    function softDrop() {
      const r = run;
      if (collide(r.board, r.current.shape, r.current.x, r.current.y + 1)) {
        lockPiece();
        return;
      }
      r.current.y++;
      r.score += 1;
    }

    /** `ESPACIO`: hasta abajo, dos puntos por celda, y se consolida. */
    function hardDrop() {
      const r = run;
      const gy = ghostY(r.board, r.current);
      r.score += (gy - r.current.y) * 2;
      r.current.y = gy;
      lockPiece();
    }

    /**
     * La pieza pasa a formar parte del tablero: se estampa, se limpian las
     * filas completas, se cobra y sale la siguiente.
     */
    function lockPiece() {
      const r = run;
      merge(r.board, r.current);
      const cleared = clearLines(r.board);
      if (cleared > 0) {
        r.score += LINE_SCORES[cleared] * r.level;
        r.lines += cleared;
        r.level = 1 + Math.floor(r.lines / 10);
        r.dropInterval = levelToDropInterval(r.level);
      }
      spawn();
    }

    /**
     * Saca la pieza siguiente de la cola. Si no cabe donde aparece, se acabó:
     * es el topout, la única forma de morir del modo clásico. El aviso hacia
     * arriba sale al final de este mismo frame, con el HUD ya cuadrado.
     */
    function spawn() {
      const r = run;
      // La cola se mantiene a `QUEUE_MAX`, así que el `??` no llega a usarse:
      // está para no afirmar a mano que `shift()` devolvió algo.
      r.current = r.queue.shift() ?? randomPiece();
      fillQueue(r.queue);
      r.lockTimer = 0;
      r.lockResets = 0;
      if (collide(r.board, r.current.shape, r.current.x, r.current.y)) {
        r.phase = "gameover";
        halt();
      }
    }

    // ── Entrada ──────────────────────────────────────────────────────────────

    /**
     * Se lee como una función y no como `run.phase === "playing"` a pelo porque
     * el análisis de flujo de TypeScript no ve que `lockPiece()` pueda acabar
     * la partida a media función, y da la segunda comprobación por imposible.
     */
    function isPlaying(): boolean {
      return run.phase === "playing";
    }

    /**
     * Cuántas veces actúa en este frame una tecla de movimiento mantenida.
     *
     * El original no tiene nada de esto: se apoya en el auto-repeat del sistema
     * operativo, que el mando táctil no produce. La primera pulsación cuenta
     * siempre; a partir de `DAS_MS` abajo, una más cada `ARR_MS`.
     */
    function steps(code: keyof Run["held"], dt: number): number {
      const held = run.held;
      if (!input.keys[code]) {
        held[code] = 0;
        return 0;
      }
      const before = held[code];
      if (before === 0) {
        // El flanco. Nunca se guarda un 0, que es "tecla suelta": con un `dt`
        // de 0 ms el frame siguiente lo leería como una pulsación nueva.
        held[code] = Math.max(dt, 1);
        return 1;
      }
      const after = before + dt;
      held[code] = after;
      if (after < DAS_MS) return 0;
      const done = before < DAS_MS ? 0 : Math.floor((before - DAS_MS) / ARR_MS) + 1;
      return Math.floor((after - DAS_MS) / ARR_MS) + 1 - done;
    }

    function handleInput(dt: number) {
      // `↑` y `ESPACIO` son solo flanco: mantenerlas no repite.
      if (input.pressed("ArrowUp")) tryRotate();

      for (let i = steps("ArrowLeft", dt); i > 0; i--) move(-1);
      for (let i = steps("ArrowRight", dt); i > 0; i--) move(1);
      // Bajar puede consolidar la pieza contra el suelo, y con ella acabar la
      // partida: a partir de ahí lo de este frame ya no es asunto suyo.
      for (let i = steps("ArrowDown", dt); i > 0 && isPlaying(); i--) softDrop();

      if (isPlaying() && input.pressed("Space")) hardDrop();
    }

    // ── Simulación y dibujo ──────────────────────────────────────────────────

    function update(dt: number) {
      const r = run;
      if (!isPlaying()) return;

      handleInput(dt);
      if (!isPlaying()) return;

      if (!collide(r.board, r.current.shape, r.current.x, r.current.y + 1)) {
        // En el aire: cae por gravedad y el lock delay no corre.
        r.lockTimer = 0;
        r.dropAccum += dt;
        if (r.dropAccum >= r.dropInterval) {
          r.dropAccum = 0;
          r.current.y++;
        }
      } else {
        // Apoyada: medio segundo para deslizarla antes de que se consolide.
        r.dropAccum = 0;
        r.lockTimer += dt;
        if (r.lockTimer >= LOCK_DELAY_MS) lockPiece();
      }
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
