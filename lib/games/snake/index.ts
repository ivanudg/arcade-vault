/**
 * Snake: la cuarta máquina del vault, y la primera escrita desde cero.
 *
 * Las otras tres son puertos de `references/started-games/`, con su física ya
 * equilibrada y su tabla de puntos decidida por otro. Aquí el material era un
 * atlas de recortes y ni una línea de lógica, así que el equilibrio —150 ms por
 * celda que bajan a 60, cinco frutas por nivel, diez puntos por nivel, tres
 * vidas— lo fija SPEC 10 y vive junto en `constants.ts`.
 *
 * Es también la primera que carga un archivo, y lo hace sin que nadie más se
 * entere: `mount()` sigue siendo síncrono, el contrato de `lib/games/engine.ts`
 * no cambia y `GameCanvas` no aprende a esperar assets. El motor pregunta al
 * atlas si ya sirve en cada frame y, mientras diga que no, la fruta es un
 * círculo magenta y la partida no se detiene.
 *
 * Como en los otros tres, el ámbito de módulo no tiene ni una variable mutable:
 * todo el estado de partida vive en el closure de `mount()`.
 */

import type { GameCallbacks, GameHandle, GameMount, GameState } from "@/lib/games/engine";
import { createInput } from "@/lib/games/input";
import { COLS, H, LIVES, ROWS, START_LEN, W } from "./constants";
import { Fruit, Snake } from "./entities";
import { pickFreeCell } from "./math";
import { loadFruitAtlas } from "./sprites";

/**
 * Estado de una partida.
 *
 * `phase` y no `state`: el `GameState` del contrato son las tres cifras del HUD,
 * y confundirlas es el error caro.
 */
interface Run {
  snake: Snake;
  fruit: Fruit;
  score: number;
  lives: number;
  level: number;
  /** Frutas comidas en el nivel actual; a `FRUITS_PER_LEVEL` sube. */
  eaten: number;
  /** Milisegundos acumulados desde el último paso de rejilla. */
  acc: number;
  /**
   * `"ready"` es la serpiente quieta en el centro esperando `ESPACIO`: es la
   * fase con la que empieza la partida y también cada vida después de perder
   * una. Reaparecer en marcha es morir antes de reaccionar.
   */
  phase: "ready" | "playing" | "gameover";
}

/** El `dt` del patrón del vault: nunca más de 0,05 s, para que una pestaña
 * oculta no teletransporte nada. */
const MAX_DT = 0.05;

/** La celda donde nace la serpiente, y donde reaparece al perder una vida. */
const SPAWN = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };

export const snakeGame: GameMount = {
  world: { width: W, height: H },
  hud: ["PUNTUACION", "VIDAS", "NIVEL"],

  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle {
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("Snake: el canvas no da contexto 2D.");
    // Con tipo declarado: el estrechamiento del `throw` no llega solo hasta las
    // funciones de dibujo, que están declaradas más abajo.
    const ctx: CanvasRenderingContext2D = context2d;

    const input = createInput();
    // Un cargador por montaje, no una caché de módulo: eso sería estado mutable
    // fuera del closure. La petición ya la cachea el navegador.
    const atlas = loadFruitAtlas();

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
      const snake = new Snake(SPAWN, "right", START_LEN);
      return {
        snake,
        fruit: new Fruit(freeCell(snake)),
        score: 0,
        lives: LIVES,
        level: 1,
        eaten: 0,
        acc: 0,
        phase: "ready",
      };
    }

    /**
     * Una celda libre para la fruta. El `??` cubre el tablero lleno, que con 500
     * celdas no llega a pasar: la serpiente choca consigo misma mucho antes.
     */
    function freeCell(snake: Snake) {
      return pickFreeCell(snake.cells, COLS, ROWS) ?? SPAWN;
    }

    // ── Frontera con React ───────────────────────────────────────────────────

    function emitState() {
      if (
        emitted &&
        emitted.score === run.score &&
        emitted.lives === run.lives &&
        emitted.level === run.level
      ) {
        return;
      }
      emitted = { score: run.score, lives: run.lives, level: run.level };
      cb.onState(emitted);
    }

    // ── Simulación ───────────────────────────────────────────────────────────

    function update(dt: number) {
      void dt;
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────

    function draw() {}

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
