/**
 * Asteroids: el motor completo, cumpliendo el contrato de `lib/games/engine.ts`.
 *
 * Todo el estado de partida vive dentro del closure de `mount()`. En el ámbito
 * de módulo no hay ni una variable mutable: montar el juego dos veces crea dos
 * partidas independientes, y destruirlo no deja nada detrás.
 *
 * El bucle es `requestAnimationFrame` a pelo, fuera de React. Nunca provoca un
 * render: los únicos avisos hacia arriba son `onState` —solo cuando cambia
 * alguna de las tres cifras del HUD— y `onGameOver`.
 */

import type { GameCallbacks, GameHandle, GameMount, GameState } from "@/lib/games/engine";
import { createInput } from "@/lib/games/input";
import {
  ALL_PU_TYPES,
  H,
  TYPES_PER_LEVEL,
  W,
  type PowerUpType,
} from "@/lib/games/asteroids/constants";
import { rand, randInt } from "@/lib/games/asteroids/math";
import { Asteroid, Bullet, Particle, PowerUp, Ship } from "@/lib/games/asteroids/entities";

/** El estado de partida entero. Una instancia por `mount()`. */
interface Run {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerups: PowerUp[];
  score: number;
  lives: number;
  level: number;
  /** Segundos restantes de cada power-up. 0 = inactivo. */
  timers: { triple: number; shield: number; slow: number; hyper: number };
  /** Control de drops del nivel actual. */
  drops: {
    types: Set<PowerUpType>;
    kills: number;
    levelTypes: PowerUpType[];
    nova: boolean;
  };
  /** Máquina de estados interna. No confundir con el `GameState` del HUD. */
  phase: "playing" | "dead" | "gameover";
  deadTimer: number;
}

/** El `dt` del original: nunca más de 0,05 s, para que una pestaña oculta no teletransporte nada. */
const MAX_DT = 0.05;

export const asteroidsGame: GameMount = {
  world: { width: W, height: H },

  mount(canvas: HTMLCanvasElement, cb: GameCallbacks): GameHandle {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Asteroids: el canvas no da contexto 2D.");

    const input = createInput();

    let run = createRun();
    let frame: number | null = null;
    let lastTime: number | null = null;
    let running = false;
    let destroyed = false;
    /** Última terna emitida, para no avisar en frames donde nada cambió. */
    let emitted: GameState | null = null;

    // ── Construcción del estado ──────────────────────────────────────────────

    function createRun(): Run {
      const fresh: Run = {
        ship: new Ship(),
        bullets: [],
        asteroids: [],
        particles: [],
        powerups: [],
        score: 0,
        lives: 3,
        level: 1,
        timers: { triple: 0, shield: 0, slow: 0, hyper: 0 },
        drops: { types: new Set(), kills: 0, levelTypes: [], nova: false },
        phase: "playing",
        deadTimer: 0,
      };
      resetLevelDrop(fresh);
      spawnAsteroids(fresh, 4);
      return fresh;
    }

    function spawnAsteroids(r: Run, count: number) {
      const SAFE_DIST = 130;
      for (let i = 0; i < count; i++) {
        let x: number;
        let y: number;
        do {
          x = rand(0, W);
          y = rand(0, H);
        } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
        r.asteroids.push(new Asteroid(x, y, 3));
      }
    }

    function resetLevelDrop(r: Run) {
      r.drops.types = new Set();
      r.drops.kills = 0;
      r.drops.nova = false;
      // Sorteo del original: se descartan tipos del pool al azar hasta dejar
      // `TYPES_PER_LEVEL`, que son los que este nivel garantiza.
      const pool = [...ALL_PU_TYPES];
      while (pool.length > TYPES_PER_LEVEL) pool.splice(randInt(0, pool.length - 1), 1);
      r.drops.levelTypes = pool;
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

    // ── Simulación y dibujo ──────────────────────────────────────────────────

    function update(dt: number) {
      void dt;
    }

    function draw() {}

    // ── Bucle ────────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
      lastTime = ts;
      update(dt);
      draw();
      emitState();
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
        emitState();
        draw();
        play();
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        halt();
      },
    };
  },
};
