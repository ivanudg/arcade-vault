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
import {
  CELL,
  COLOR_BG,
  COLOR_GRID,
  COLS,
  FRUITS_PER_LEVEL,
  H,
  LIVES,
  MAX_LEVEL,
  POINTS_PER_FRUIT,
  ROWS,
  START_LEN,
  W,
  tickFor,
} from "./constants";
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

    // ── Sucesos de partida ───────────────────────────────────────────────────

    /**
     * La serpiente se estrelló contra la pared o contra sí misma.
     *
     * Se conservan la puntuación y el nivel —o sea la velocidad ganada— y se
     * pierde la longitud: reaparecer largo es morir otra vez en dos ticks, y
     * reiniciar el nivel convertiría tres vidas en tres partidas cortas pegadas.
     */
    function loseLife(r: Run) {
      r.lives -= 1;
      if (r.lives <= 0) {
        r.lives = 0;
        r.phase = "gameover";
        // El bucle se detiene aquí; el aviso sale al final de este frame, con el
        // HUD ya cuadrado.
        halt();
        return;
      }
      r.snake = new Snake(SPAWN, "right", START_LEN);
      r.fruit.place(freeCell(r.snake));
      r.acc = 0;
      r.phase = "ready";
    }

    /** Fruta comida: puntos, un segmento más y otra fruta en una celda libre. */
    function eat(r: Run) {
      r.score += POINTS_PER_FRUIT * r.level;
      r.snake.grow();

      r.eaten += 1;
      if (r.eaten >= FRUITS_PER_LEVEL) {
        r.eaten = 0;
        // El nivel 10 es el último que acelera; a partir de ahí se sigue jugando
        // al mismo ritmo hasta perder.
        if (r.level < MAX_LEVEL) r.level += 1;
      }

      // Después de `grow()`, y a propósito: el segmento que falta por aparecer
      // sale sobre la cola actual, que sigue en `cells`, así que la fruta nueva
      // no puede caer debajo de él.
      r.fruit.place(freeCell(r.snake));
    }

    /** Un paso de rejilla: avanzar y ver contra qué se ha chocado. */
    function stepOnce(r: Run) {
      r.snake.step();

      if (r.snake.hitsWall() || r.snake.hitsSelf()) {
        loseLife(r);
        return;
      }

      const head = r.snake.head;
      if (head.x === r.fruit.x && head.y === r.fruit.y) eat(r);
    }

    // ── Simulación ───────────────────────────────────────────────────────────

    function update(dt: number) {
      const r = run;

      if (r.phase === "gameover") return;

      if (r.phase === "ready") {
        if (input.pressed("Space")) {
          r.phase = "playing";
          // El primer paso llega un tick entero después, no en este frame.
          r.acc = 0;
        }
        return;
      }

      // Los cuatro flancos se consumen siempre, aunque el giro se descarte: uno
      // sin leer se aplicaría solo en el frame siguiente, como un giro fantasma.
      // Cabe un giro por tick y gana el primero de este orden.
      const up = input.pressed("ArrowUp");
      const down = input.pressed("ArrowDown");
      const left = input.pressed("ArrowLeft");
      const right = input.pressed("ArrowRight");
      if (up) r.snake.queue("up");
      if (down) r.snake.queue("down");
      if (left) r.snake.queue("left");
      if (right) r.snake.queue("right");

      // El acumulador va en milisegundos, como el tick. El `while` no llega a
      // dar dos pasos —`MAX_DT` son 50 ms y el tick más corto son 60—, pero la
      // condición se relee en cada vuelta porque comer puede subir el nivel, y
      // perder una vida cambia la fase y sale.
      r.acc += dt * 1000;
      while (r.phase === "playing" && r.acc >= tickFor(r.level)) {
        r.acc -= tickFor(r.level);
        stepOnce(r);
      }
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────

    /**
     * El tablero entero, y nada más.
     *
     * Ni puntuación, ni vidas, ni nivel, ni `GAME OVER`: eso lo pinta React a
     * veinte píxeles del canvas, como en las otras tres máquinas. El motor solo
     * sube las tres cifras por `onState`.
     *
     * La misma rejilla tenue de la escena archivada que hace de miniatura, con
     * su mismo `rgba(0,245,255,0.1)`.
     */
    function draw() {
      const r = run;

      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, W, H);

      // El medio píxel es lo que separa una línea de 1 px nítida de una franja
      // gris de 2 px: el canvas va escalado por `devicePixelRatio`.
      ctx.strokeStyle = COLOR_GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let col = 1; col < COLS; col++) {
        ctx.moveTo(col * CELL + 0.5, 0);
        ctx.lineTo(col * CELL + 0.5, H);
      }
      for (let row = 1; row < ROWS; row++) {
        ctx.moveTo(0, row * CELL + 0.5);
        ctx.lineTo(W, row * CELL + 0.5);
      }
      ctx.stroke();

      r.fruit.draw(ctx, atlas.ready() ? atlas.image : null);
      r.snake.draw(ctx);
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
