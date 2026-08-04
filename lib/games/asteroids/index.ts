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
  DROP_CHANCE,
  DROP_GUARANTEE,
  H,
  HYPER_COLOR,
  HYPER_DURATION,
  NOVA_CHANCE,
  POINTS,
  PU_COLOR,
  SHIELD_COLOR,
  SHIELD_DURATION,
  SLOW_COLOR,
  SLOW_DURATION,
  SLOW_FACTOR,
  TRIPLE_DURATION,
  TYPES_PER_LEVEL,
  W,
  type PowerUpType,
} from "@/lib/games/asteroids/constants";
import { dist, rand, randInt } from "@/lib/games/asteroids/math";
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
    const context2d = canvas.getContext("2d");
    if (!context2d) throw new Error("Asteroids: el canvas no da contexto 2D.");
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

    // ── Sucesos de partida ───────────────────────────────────────────────────

    function explode(r: Run, x: number, y: number, count = 8) {
      for (let i = 0; i < count; i++) r.particles.push(new Particle(x, y));
    }

    function tryDropPowerup(r: Run, x: number, y: number) {
      // Tipos garantizados del nivel (uno de cada)
      if (r.drops.types.size < r.drops.levelTypes.length) {
        r.drops.kills++;
        for (const t of r.drops.levelTypes) {
          if (r.drops.types.has(t)) continue;
          if (Math.random() < DROP_CHANCE || r.drops.kills >= DROP_GUARANTEE) {
            r.powerups.push(new PowerUp(x, y, t));
            r.drops.types.add(t);
            return; // máx. un item por destrucción, para espaciarlos
          }
        }
      }
      // Bomba Nova: escasa, máx 1 por nivel, sin garantía
      if (!r.drops.nova && Math.random() < NOVA_CHANCE) {
        r.powerups.push(new PowerUp(x, y, "nova"));
        r.drops.nova = true;
      }
    }

    function detonateNova(r: Run) {
      for (const a of r.asteroids) {
        r.score += POINTS[a.size];
        explode(r, a.x, a.y, a.size * 5);
      }
      r.asteroids = [];
    }

    function nextLevel(r: Run) {
      r.level++;
      r.bullets = [];
      r.particles = [];
      // No arrastrar un item sin recoger; los temporizadores activos sí siguen.
      r.powerups = [];
      resetLevelDrop(r);
      r.ship.reset();
      spawnAsteroids(r, 3 + r.level);
    }

    function killShip(r: Run) {
      explode(r, r.ship.x, r.ship.y, 14);
      r.ship.dead = true;
      r.lives--;
      if (r.lives <= 0) {
        r.phase = "gameover";
        // El original esperaba a ESPACIO para reiniciar; aquí manda React, así
        // que el bucle se detiene y el aviso sale al final de este frame.
        halt();
      } else {
        r.phase = "dead";
        r.deadTimer = 2;
      }
    }

    // ── Simulación y dibujo ──────────────────────────────────────────────────

    function update(dt: number) {
      const r = run;

      if (r.phase === "gameover") return;

      if (r.phase === "dead") {
        r.deadTimer -= dt;
        r.particles.forEach((p) => p.update(dt));
        r.particles = r.particles.filter((p) => !p.dead);
        r.asteroids.forEach((a) => a.update(dt));
        if (r.deadTimer <= 0) {
          r.phase = "playing";
          r.ship.reset();
        }
        return;
      }

      if (r.timers.triple > 0) r.timers.triple -= dt;
      if (r.timers.shield > 0) r.timers.shield -= dt;
      if (r.timers.slow > 0) r.timers.slow -= dt;
      if (r.timers.hyper > 0) r.timers.hyper -= dt;

      // Disparar
      if (input.pressed("Space")) {
        r.bullets.push(...r.ship.tryShoot(r.timers.triple > 0));
      }

      r.ship.update(dt, input, r.timers.hyper > 0);
      r.bullets.forEach((b) => b.update(dt));
      // Slow motion: solo los asteroides van a mitad de velocidad; nave y balas normales
      const astDt = r.timers.slow > 0 ? dt * SLOW_FACTOR : dt;
      r.asteroids.forEach((a) => a.update(astDt));
      r.particles.forEach((p) => p.update(dt));
      r.powerups.forEach((p) => p.update(dt));

      r.bullets = r.bullets.filter((b) => !b.dead);
      r.particles = r.particles.filter((p) => !p.dead);

      // Bala vs asteroide
      const newAsteroids: Asteroid[] = [];
      for (const b of r.bullets) {
        for (const a of r.asteroids) {
          if (!a.dead && !b.dead && dist(b, a) < a.radius) {
            b.dead = true;
            a.dead = true;
            r.score += POINTS[a.size];
            explode(r, a.x, a.y, a.size * 5);
            newAsteroids.push(...a.split());
            tryDropPowerup(r, a.x, a.y);
          }
        }
      }
      r.asteroids = r.asteroids.filter((a) => !a.dead).concat(newAsteroids);
      r.bullets = r.bullets.filter((b) => !b.dead);

      // Nave vs power-up
      for (const p of r.powerups) {
        if (!p.dead && dist(r.ship, p) < r.ship.radius + p.radius) {
          p.dead = true;
          if (p.type === "triple") r.timers.triple = TRIPLE_DURATION;
          else if (p.type === "shield") r.timers.shield = SHIELD_DURATION;
          else if (p.type === "slow") r.timers.slow = SLOW_DURATION;
          else if (p.type === "hyper") r.timers.hyper = HYPER_DURATION;
          else if (p.type === "nova") detonateNova(r);
          explode(r, p.x, p.y, 12); // destello al recoger
        }
      }
      r.powerups = r.powerups.filter((p) => !p.dead);

      // Nave vs asteroide
      if (r.ship.invincible <= 0) {
        for (const a of r.asteroids) {
          if (dist(r.ship, a) < r.ship.radius + a.radius * 0.82) {
            if (r.timers.shield > 0) {
              r.timers.shield = 0; // el escudo absorbe el impacto y se consume
              a.dead = true;
              r.score += POINTS[a.size];
              explode(r, a.x, a.y, a.size * 5);
              r.asteroids = r.asteroids.filter((x) => !x.dead).concat(a.split());
            } else {
              killShip(r);
            }
            break;
          }
        }
      }

      // Nivel completado
      if (r.asteroids.length === 0) nextLevel(r);
    }

    /** Barra de un power-up activo, en la esquina inferior izquierda. */
    function drawPowerBar(label: string, frac: number, color: string, y: number) {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.lineWidth = 1;
      ctx.fillText(label, 14, y);
      const bx = 84;
      const bw = 120;
      const bh = 10;
      const by = y - 10;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillRect(bx, by, bw * frac, bh);
    }

    function drawShield(r: Run) {
      if (r.timers.shield <= 0 || r.ship.dead) return;
      // Parpadeo en el último ~1s antes de expirar
      if (r.timers.shield < 1 && Math.floor(r.timers.shield * 8) % 2 === 0) return;
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.ship.x, r.ship.y, r.ship.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    /**
     * El `SCORE`, el `NIVEL` y los iconos de vidas del original no se pintan:
     * están en el HUD de React, a veinte píxeles del canvas. Del `drawHUD`
     * original solo sobreviven las barras de power-up, que no tienen sitio
     * fuera. El `GAME OVER` tampoco: lo pinta el superpuesto que ya existe.
     */
    function draw() {
      const r = run;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      r.particles.forEach((p) => p.draw(ctx));
      r.asteroids.forEach((a) => a.draw(ctx));
      r.bullets.forEach((b) => b.draw(ctx));
      r.powerups.forEach((p) => p.draw(ctx));
      drawShield(r);
      r.ship.draw(ctx);

      // Indicadores de power-ups activos (fila inferior, uno por línea)
      if (r.timers.hyper > 0)
        drawPowerBar("HYPER", r.timers.hyper / HYPER_DURATION, HYPER_COLOR, H - 68);
      if (r.timers.slow > 0)
        drawPowerBar("SLOW", r.timers.slow / SLOW_DURATION, SLOW_COLOR, H - 50);
      if (r.timers.shield > 0)
        drawPowerBar("SHIELD", r.timers.shield / SHIELD_DURATION, SHIELD_COLOR, H - 32);
      if (r.timers.triple > 0)
        drawPowerBar("TRIPLE", r.timers.triple / TRIPLE_DURATION, PU_COLOR, H - 14);
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
