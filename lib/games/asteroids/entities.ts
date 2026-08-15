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

import { glow, noGlow, tint } from "@/lib/games";
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

// ── El halo ──────────────────────────────────────────────────────────────────

/**
 * Radio del halo cuando la piel separa las entidades por tinte: 8 px.
 *
 * Va en píxeles y no en fracción de nada, al revés que el de Tetris, y es
 * deliberado: allí la unidad natural era el lado de la celda, que cambia entre
 * el tablero y la banda de la siguiente, y aquí el mundo mide siempre `W × H` y
 * ninguna entidad se escala. Lo que manda el radio tampoco es el tamaño de la
 * entidad sino el **grosor del trazo**, que es 1,5 px en las cuatro que se
 * dibujan con `stroke` y 1 en la partícula: un halo proporcional al asteroide
 * dejaría la bala sin aura y la roca grande convertida en una nube.
 *
 * 8 px son algo más de cinco veces ese grosor, que es lo que hace que un trazo
 * de vectores se lea como un tubo encendido. Y es el techo: la silueta de la
 * nave mide 18 px entre las puntas de las alas, así que con un radio mayor las
 * auras de sus dos bordes se cruzarían por dentro y el triángulo se rellenaría
 * de luz en vez de quedarse hueco. El objeto más pequeño, la bala de radio 2,
 * conserva con este valor un núcleo sólido dentro del resplandor.
 */
const GLOW_BLUR = 8;

/**
 * El radio corto, para una piel que separa las entidades por brillo: 3 px.
 *
 * En una rampa monocroma el tinte ya no distingue nada y el escalón es lo único
 * que queda: `#33ff33` lo tuyo, `#22aa22` lo que te mata, `#116611` lo que sólo
 * decora. Un aura de 8 px de un vivo que cae encima de un medio lo empuja hacia
 * arriba y borra el escalón, y eso sí sería un choque de S3 —una roca a punto de
 * tocarte se leería como parte de tu propia nave—. Con 3 px el sangrado se apaga
 * pegado al trazo y los escalones aguantan a partir de unos pocos píxeles de
 * separación. Es además lo que hace un fósforo de verdad, que sangra corto,
 * frente al letrero de neón, que sangra amplio.
 */
const GLOW_BLUR_TIGHT = 3;

/**
 * Cuánto halo pide esta piel.
 *
 * **La piel dice si hay halo y el motor dice de cuánto**, que es la misma
 * frontera que ya rige el alfa. El motor mide mirando la paleta que tiene
 * delante y no el nombre de la piel —aquí ni siquiera podría mirarlo: a
 * `draw()` llega una `Palette`, nunca un `SkinId`—.
 *
 * Lo que mira son los cinco power-ups, que es el mismo indicador que usa Tetris
 * con sus siete piezas: una piel que ha tenido que darles a los cinco el mismo
 * color es una piel que se quedó sin tintes libres, y en ella lo que separa las
 * entidades es el brillo, que es justo lo que un halo largo funde. Así una
 * cuarta piel monocroma se resolvería sola, sin tocar este archivo.
 *
 * Lo exporta para `drawShield()`, que es la única entidad que se dibuja desde
 * `index.ts` —necesita el `Run` entero— y tiene que salir con el mismo halo que
 * el icono del que viene, porque las dos son la misma ranura de la paleta.
 */
export function glowSpread(p: Palette): number {
  const monochrome =
    p.shield === p.triple && p.slow === p.triple && p.hyper === p.triple && p.nova === p.triple;
  return monochrome ? GLOW_BLUR_TIGHT : GLOW_BLUR;
}

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
    // El halo es estado global del contexto y aquí no hay `restore()` que lo
    // suelte: se apaga en esta misma función, o lo hereda el dibujo siguiente.
    if (p.glow) glow(ctx, p.bullet, glowSpread(p));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    if (p.glow) noGlow(ctx);
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
    if (p.glow) glow(ctx, p.asteroid, glowSpread(p));
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    if (p.glow) noGlow(ctx);
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
    if (p.glow) glow(ctx, p.ship, glowSpread(p));
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
      const flame = tint(p.thruster, 0.85);
      ctx.strokeStyle = flame;
      // La llama es otra ranura: reengancha el halo con su color, o ardería del
      // de la silueta. El aura toma el mismo `rgba` que el trazo, así que el
      // velo del motor la atraviesa entera en vez de quedarse opaca detrás.
      if (p.glow) glow(ctx, flame, glowSpread(p));
      ctx.stroke();
    }

    if (p.glow) noGlow(ctx);
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
    const dust = tint(p.particle, Number(alpha.toFixed(2)));
    ctx.strokeStyle = dust;
    // El aura se apaga con la partícula porque toma su mismo `rgba`: un halo
    // opaco alrededor de un trazo que se desvanece dejaría el polvo encendido
    // después de haberse ido.
    if (p.glow) glow(ctx, dust, glowSpread(p));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    if (p.glow) noGlow(ctx);
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
      if (p.glow) glow(ctx, p.shield, glowSpread(p));
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === "slow") {
      // Reloj (alude a la cámara lenta)
      ctx.strokeStyle = p.slow;
      if (p.glow) glow(ctx, p.slow, glowSpread(p));
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
      if (p.glow) glow(ctx, p.hyper, glowSpread(p));
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
      if (p.glow) glow(ctx, p.nova, glowSpread(p));
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
      if (p.glow) glow(ctx, p.triple, glowSpread(p));
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

    if (p.glow) noGlow(ctx);
    ctx.restore();
  }
}
