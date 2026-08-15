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
 * - **No se sortea nada, en ninguna parte.** Los carriles, las tortugas que se
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
  COLOR_BANK,
  COLOR_LANE_LINE,
  COLOR_ROAD,
  COLOR_TIMER,
  COLOR_TIMER_LOW,
  COLOR_WATER,
  DEATH_MS,
  HOP_MS,
  LADY_ROW,
  LIVES,
  POINTS_FLY,
  POINTS_HOME,
  POINTS_LADY,
  POINTS_ROUND,
  POINTS_ROW,
  POINTS_TIME,
  ROW_HOMES,
  ROW_MEDIAN,
  ROW_RIVER_BOTTOM,
  ROW_RIVER_TOP,
  ROW_ROAD_BOTTOM,
  ROW_ROAD_TOP,
  ROW_START,
  SNAKE_FROM,
  SPEED_MAX,
  SPEED_STEP,
  START_COL,
  TIME_LOW,
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

/** Multiplicador de velocidad de la ronda, el mismo que aplica `lanesForRound`. */
function speedMult(round: number): number {
  return Math.min(SPEED_STEP ** (round - 1), SPEED_MAX);
}

/** Las cuatro direcciones, en el orden en que se resuelven si llegan juntas. */
const HOPS: readonly { code: string; dx: number; dy: number }[] = [
  { code: "ArrowUp", dx: 0, dy: -1 },
  { code: "ArrowDown", dx: 0, dy: 1 },
  { code: "ArrowLeft", dx: -1, dy: 0 },
  { code: "ArrowRight", dx: 1, dy: 0 },
];

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

    // ── Sucesos de partida ───────────────────────────────────────────────────

    /** El carril de una fila, o `null` si esa fila es orilla o mediana. */
    function laneAt(r: Run, row: number): Lane | null {
      return r.lanes.find((lane) => lane.spec.row === row) ?? null;
    }

    const inRiver = (row: number) => row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOTTOM;
    const inRoad = (row: number) => row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOTTOM;

    /**
     * La rana se ha quedado sin travesía.
     *
     * La vida se descuenta ya, pero la partida no termina aquí: pasa por
     * `"dead"` durante `DEATH_MS` para que se vea **qué** la mató, y sólo al
     * acabar esa fase se decide si reaparece o si se acabó.
     */
    function die(r: Run) {
      r.lives -= 1;
      // La dama-rana se pierde con la vida que la llevaba.
      r.frog.escorting = false;
      r.frog.hop = null;
      r.phase = "dead";
      r.timer = DEATH_MS / 1000;
    }

    /** Vuelta a la acera conservando puntuación, ronda y nichos ya ocupados. */
    function respawn(r: Run) {
      r.frog = new Frog(START_COL * CELL, ROW_START);
      r.time = timeForRound(r.round);
      r.phase = "ready";
    }

    /** Arranca un salto de una celda, si el destino cae dentro del tablero. */
    function startHop(r: Run, dx: number, dy: number) {
      // Cuadrar antes de saltar: en el río la plataforma arrastra la rana y su
      // `x` deja de ser múltiplo de la celda; sin esto el desfase se heredaría
      // durante el resto de la travesía.
      r.frog.snap();

      const fromX = r.frog.x;
      const fromRow = r.frog.row;
      const toX = Math.min(Math.max(fromX + dx * CELL, 0), W - CELL);
      const toRow = Math.min(Math.max(fromRow + dy, 0), ROW_START);
      if (toX === fromX && toRow === fromRow) return;

      r.frog.hop = { fromX, fromRow, toX, toRow, k: 0 };
    }

    /**
     * Travesía siguiente: la rana vuelve a la acera sin pasar por `"ready"`.
     *
     * Llegar a casa no vuelve a pedir `ESPACIO`: pararse cinco veces por ronda
     * sería un peaje, y llegar no tiene el problema que tiene morir.
     */
    function newCrossing(r: Run) {
      r.frog = new Frog(START_COL * CELL, ROW_START);
      r.time = timeForRound(r.round);
    }

    /** Los cinco nichos llenos: se sube de ronda y el tablero se recarga. */
    function nextRound(r: Run) {
      r.score += POINTS_ROUND;
      r.round += 1;
      // El reloj de la ronda vuelve a cero: los carriles arrancan alineados con
      // sus desfases, y la fauna estrena sus ciclos.
      r.t = 0;
      r.lanes = lanesForRound(r.round).map((spec) => new Lane(spec));
      r.homes.reset();
      r.bonus.reset();
      r.snake = r.round >= SNAKE_FROM ? new Snake(0) : null;
      newCrossing(r);
    }

    /**
     * La rana ha aterrizado en la fila de casas.
     *
     * Sólo vale un nicho libre y sin cocodrilo: caer entre dos, en uno ya
     * ocupado o en el que tiene el bicho es perder una vida.
     */
    function arriveHome(r: Run) {
      const i = r.homes.indexAt(r.frog.x);
      if (i === null || r.homes.filled[i] || r.homes.gatorAt(r.t, r.round) === i) {
        die(r);
        return;
      }

      const fly = r.homes.flyAt(r.t, r.round) === i;
      r.homes.filled[i] = true;

      r.score += POINTS_HOME + POINTS_TIME * Math.floor(Math.max(r.time, 0));
      if (fly) r.score += POINTS_FLY;
      if (r.frog.escorting) r.score += POINTS_LADY;
      r.frog.escorting = false;

      if (r.homes.complete) nextRound(r);
      else newCrossing(r);
    }

    /** Fin del salto: se resuelve el aterrizaje y se cobran las filas nuevas. */
    function land(r: Run) {
      const hop = r.frog.hop;
      if (!hop) return;
      r.frog.x = hop.toX;
      r.frog.row = hop.toRow;
      r.frog.hop = null;

      if (r.frog.row < r.frog.best) {
        r.score += POINTS_ROW * (r.frog.best - r.frog.row);
        r.frog.best = r.frog.row;
      }
    }

    // ── Simulación ───────────────────────────────────────────────────────────

    function update(dt: number) {
      const r = run;
      if (r.phase === "gameover") return;

      // El mundo corre también en `"ready"` y en `"dead"`: los carriles no se
      // paran porque la rana esté esperando o acabe de morir.
      r.t += dt;
      if (r.snake) r.snake.update(dt, speedMult(r.round));
      const ladyLane = laneAt(r, LADY_ROW);
      if (ladyLane) r.bonus.update(r.t, r.round, ladyLane);

      if (r.phase === "ready") {
        if (input.pressed("Space")) r.phase = "playing";
        return;
      }

      if (r.phase === "dead") {
        r.timer -= dt;
        if (r.timer > 0) return;
        if (r.lives <= 0) {
          r.lives = 0;
          r.phase = "gameover";
          // El bucle se detiene aquí; el aviso sale al final de este frame, con
          // el HUD ya cuadrado.
          halt();
          return;
        }
        respawn(r);
        return;
      }

      // ── A partir de aquí, `"playing"` ──

      // 1. El salto en curso. La colisión se resuelve **al aterrizar**: pasar
      //    por encima de un coche mientras se salta no mata.
      if (r.frog.hop) {
        r.frog.hop.k += (dt * 1000) / HOP_MS;
        if (r.frog.hop.k >= 1) land(r);
      } else {
        // 2. En el río, la plataforma arrastra a la rana.
        const lane = inRiver(r.frog.row) ? laneAt(r, r.frog.row) : null;
        if (lane && lane.carrier(r.t, r.frog.x) !== null) {
          r.frog.x += lane.spec.speed * dt;
        }
      }

      // 3. La entrada. Los cuatro flancos se consumen siempre, aunque el salto
      //    se descarte: uno sin leer se aplicaría solo en el frame siguiente,
      //    como un salto fantasma. Cabe uno por frame y gana el primero de la
      //    lista; mantener la flecha no encadena saltos.
      let hopped = false;
      for (const dir of HOPS) {
        const edge = input.pressed(dir.code);
        if (edge && !hopped && !r.frog.hop) {
          startHop(r, dir.dx, dir.dy);
          hopped = true;
        }
      }

      // 4. El cronómetro corre sólo mientras se juega.
      r.time -= dt;

      // 5. Y las cinco formas de perder una vida, en este orden. Ninguna se
      //    comprueba a mitad de salto.
      if (!r.frog.hop) {
        const row = r.frog.row;
        const lane = laneAt(r, row);

        // La llegada, que es la sexta cosa que puede pasar al aterrizar y la
        // única buena. Sale de aquí con la rana ya de vuelta en la acera.
        if (row === ROW_HOMES) {
          arriveHome(r);
          return;
        }

        // La dama-rana se recoge pisando su plataforma: viaja como una bandera,
        // no como una entidad que sigue a la rana.
        if (r.bonus.active && row === LADY_ROW && Math.abs(r.frog.x - r.bonus.laneX) < CELL) {
          r.frog.escorting = true;
          r.bonus.take();
        }

        // Atropello.
        if (inRoad(row) && lane && lane.hits(r.t, r.frog.x)) return die(r);

        // Ahogo: sin plataforma sólida bajo el centro, el río mata.
        if (inRiver(row) && (!lane || lane.carrier(r.t, r.frog.x) === null)) return die(r);

        // Arrastrada fuera del tablero por su propia plataforma.
        if (r.frog.x < 0 || r.frog.x > W - CELL) return die(r);

        // La serpiente de la mediana.
        if (row === ROW_MEDIAN && r.snake && r.snake.hits(r.frog.x)) return die(r);
      }

      // Agotar el cronómetro mata también a mitad de salto: el tiempo no espera.
      if (r.time <= 0) {
        r.time = 0;
        return die(r);
      }
    }

    // ── Dibujo ───────────────────────────────────────────────────────────────

    /** Una franja segura: orilla de arriba, mediana y acera de salida. */
    function drawBank(row: number) {
      const y = row * CELL;
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = COLOR_BANK;
      ctx.fillRect(0, y, W, CELL);
      ctx.globalAlpha = 1;
      ctx.fillStyle = COLOR_BANK;
      ctx.fillRect(0, y, W, 2);
      ctx.fillRect(0, y + CELL - 2, W, 2);
    }

    /**
     * El cronómetro de la travesía, bajo la fila de casas.
     *
     * Es la barra que sustituye a una cuarta cifra del HUD, y se vacía de
     * izquierda a derecha: lo que queda se apoya en el borde derecho.
     */
    function drawTimer(r: Run) {
      const total = timeForRound(r.round);
      const frac = Math.max(0, Math.min(r.time / total, 1));
      const width = W * frac;
      const y = CELL - 6;
      ctx.fillStyle = r.time <= TIME_LOW ? COLOR_TIMER_LOW : COLOR_TIMER;
      ctx.fillRect(W - width, y, width, 4);
    }

    /**
     * El tablero entero, y nada más.
     *
     * Ni puntuación, ni vidas, ni ronda, ni `GAME OVER`: eso lo pinta React a
     * veinte píxeles del canvas, como en las otras cuatro máquinas. El motor
     * sólo sube las tres cifras por `onState`. La única excepción es el
     * cronómetro, que no tiene equivalente fuera.
     */
    function draw() {
      const r = run;

      // Asfalto de fondo y agua encima, en su franja.
      ctx.fillStyle = COLOR_ROAD;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COLOR_WATER;
      ctx.fillRect(0, ROW_RIVER_TOP * CELL, W, (ROW_RIVER_BOTTOM - ROW_RIVER_TOP + 1) * CELL);

      // Líneas de carril: sólo entre carriles de carretera, discontinuas.
      ctx.fillStyle = COLOR_LANE_LINE;
      for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOTTOM; row++) {
        for (let x = 0; x < W; x += 24) ctx.fillRect(x, row * CELL - 1, 14, 2);
      }

      // Las dos orillas y la mediana.
      drawBank(ROW_HOMES);
      drawBank(ROW_MEDIAN);
      drawBank(ROW_START);

      r.homes.draw(ctx, r.t, r.round);
      drawTimer(r);

      // Primero el río y después la carretera, que es el orden en que se leen
      // de arriba abajo.
      for (const lane of r.lanes) {
        if (lane.spec.kind === "log" || lane.spec.kind === "turtle") lane.draw(ctx, r.t);
      }
      for (const lane of r.lanes) {
        if (lane.spec.kind === "car" || lane.spec.kind === "truck") lane.draw(ctx, r.t);
      }

      if (r.snake) r.snake.draw(ctx);
      r.bonus.draw(ctx);
      r.frog.draw(ctx);

      // La X de la fase `"dead"`, encima de la rana: es lo que hace que se vea
      // qué la mató antes de reaparecer.
      if (r.phase === "dead") {
        const x = r.frog.viewX();
        const y = r.frog.viewY();
        ctx.strokeStyle = COLOR_TIMER_LOW;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 6);
        ctx.lineTo(x + CELL - 6, y + CELL - 6);
        ctx.moveTo(x + CELL - 6, y + 6);
        ctx.lineTo(x + 6, y + CELL - 6);
        ctx.stroke();
      }
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
