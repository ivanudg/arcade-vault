/**
 * Entidades de Asteroids: bala, asteroide, nave, partícula y power-up.
 *
 * Puerto de las cinco clases del original. La física y los trazos no cambian ni
 * un número; lo único que cambia es de dónde salen las dependencias, porque
 * aquí no hay variables de módulo que leer:
 *
 * - `draw()` recibe el `ctx` por parámetro en vez de cerrar sobre el global.
 * - `Ship.update()` recibe `(dt, input, hyperActive)` en vez de leer `keys` y
 *   `hyperTimer` del ámbito de módulo.
 * - `draw()` recibe además la `Palette` de la piel activa, por el mismo motivo:
 *   vive en el closure de `mount()` y aquí no hay dónde leerla. Los alfas siguen
 *   siendo del dibujo, no de la piel.
 */

import { tint } from "@/lib/games";
import type { GameInput } from "@/lib/games/input";
import {
  HYPER_DRAG,
  HYPER_ROT_MULT,
  HYPER_THRUST_MULT,
  RADII,
  SHIP_DRAG,
  SPEEDS,
  TRIPLE_SPREAD,
  W,
  H,
  type PowerUpType,
} from "@/lib/games/asteroids/constants";
import { rand, randInt, wrap } from "@/lib/games/asteroids/math";
import type { Palette } from "@/lib/games/asteroids/skins";

// ── Bullet ───────────────────────────────────────────────────────────────────
export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette) {
    ctx.fillStyle = p.bullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ─────────────────────────────────────────────────────────────────
export class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  /** Polígono irregular, en coordenadas locales. */
  verts: [number, number][] = [];
  dead = false;

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = p.asteroid;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ─────────────────────────────────────────────────────────────────────
export class Ship {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  /** Segundos de invulnerabilidad de reaparición. */
  invincible = 3;
  shootCooldown = 0;
  dead = false;

  constructor() {
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, input: GameInput, hyperActive: boolean) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT = 3.5 * (hyperActive ? HYPER_ROT_MULT : 1); // rad/s
    const THRUST = 260 * (hyperActive ? HYPER_THRUST_MULT : 1); // px/s²
    const DRAG = hyperActive ? HYPER_DRAG : SHIP_DRAG;

    if (input.keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (input.keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!input.keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(triple: boolean): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (!triple) return [new Bullet(ox, oy, this.angle)];
    return [
      new Bullet(ox, oy, this.angle),
      new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
      new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = p.ship;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      // El 0,85 es del dibujo, no de la piel: la llama siempre va translúcida.
      ctx.strokeStyle = tint(p.thruster, 0.85);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ───────────────────────────────────────────────────
export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette) {
    // El trazo se apaga con la vida que le queda: ese alfa es del dibujo y la
    // piel sólo decide de qué color es el polvo.
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = tint(p.particle, Number(alpha.toFixed(2)));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up recolectable ────────────────────────────────────────────────────
export class PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  radius = 11;
  rot = 0;
  rotSpeed = 1.4;
  vx: number;
  vy: number;
  dead = false;

  constructor(x: number, y: number, type: PowerUpType) {
    this.x = x;
    this.y = y;
    this.type = type;
    // Deriva lenta para que no quede estático (con wrap toroidal)
    const angle = rand(0, Math.PI * 2);
    const speed = rand(12, 24);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  draw(ctx: CanvasRenderingContext2D, p: Palette) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    if (this.type === "shield") {
      // Anillo doble (alude al escudo de energía)
      ctx.strokeStyle = p.shield;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === "slow") {
      // Reloj (alude a la cámara lenta)
      ctx.strokeStyle = p.slow;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      // Manecillas
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -this.radius * 0.6);
      ctx.moveTo(0, 0);
      ctx.lineTo(this.radius * 0.5, 0);
      ctx.stroke();
    } else if (this.type === "hyper") {
      // Doble chevron (>>) (alude a la velocidad)
      ctx.strokeStyle = p.hyper;
      const r = this.radius;
      for (const dx of [-r * 0.5, r * 0.15]) {
        ctx.beginPath();
        ctx.moveTo(dx, -r * 0.7);
        ctx.lineTo(dx + r * 0.6, 0);
        ctx.lineTo(dx, r * 0.7);
        ctx.stroke();
      }
    } else if (this.type === "nova") {
      // Estallido radial (alude a la explosión)
      ctx.strokeStyle = p.nova;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
        ctx.stroke();
      }
    } else {
      // Triple: rombo + abanico de 3 líneas
      ctx.strokeStyle = p.triple;
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.closePath();
      ctx.stroke();

      for (const a of [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.sin(a) * this.radius, -Math.cos(a) * this.radius);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
