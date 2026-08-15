/**
 * Paddle y bola de Arkanoid: sus tipos, su movimiento, sus dos colisiones y su
 * dibujo.
 *
 * Puerto de `src/state.js`, `src/input.js`, `src/physics.js` y
 * `src/collision.js` del original. La física no cambia ni un número; lo que
 * cambia es de dónde salen las dependencias y qué se lleva cada función:
 *
 * - Todo entra por parámetro. En el original `updateBall()`, `ballVsPaddle()` y
 *   `ballVsBlocks()` leían `ball`, `paddle`, `game` y `blocks` del ámbito de
 *   módulo; aquí ese estado vive dentro del closure de `mount()`.
 * - Las colisiones **cuentan lo que pasó** y no actúan por su cuenta: no suman
 *   puntos ni reproducen sonido. Quien llama decide qué hacer con el resultado.
 * - `draw()` recibe el `ctx` en vez de cerrar sobre el global.
 *
 * Y el dibujo es de primitivas. El original recorta cada cosa de
 * `assets/spritesheet-breakout.png`; aquí paddle y bloques son `fillRect` y la
 * bola es un `arc`. En el PNG el paddle es blanco con remaches rojos y la bola
 * gris muy claro, así que el blanco liso de la piel `clasico` es lo más cerca
 * que queda del original sin cargar un archivo.
 *
 * Los colores llegan por parámetro, en la `Palette` de la piel activa: vive en
 * el closure de `mount()`, así que dos partidas del mismo juego no comparten
 * color. Desde el 2026-08-15 la piel trae además un rasgo de dibujo, `glow`, y
 * el radio de ese halo lo miden aquí `GLOW_BLUR` y `GLOW_BLUR_TIGHT`: no hay
 * una segunda geometría escondida, ni el `fillRect` ni el `arc` ni las
 * colisiones cambian, sólo el `shadowBlur` del contexto mientras se pinta.
 */

import { glow, noGlow } from "@/lib/games";
import type { GameInput } from "@/lib/games/input";
import {
  BALL_RADIUS,
  BLOCK_KINDS,
  LAUNCH_VX,
  LAUNCH_VY,
  MAX_BOUNCE_ANGLE,
  PADDLE,
  UNBREAKABLE_LETTER,
  WORLD,
  growthForLevel,
  maxSpeedForLevel,
} from "./constants";
import type { Block } from "./levels";
import type { Palette } from "./skins";

/** `x`/`y` son la esquina superior-izquierda. */
export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

/** `x`/`y` son el **centro** de la bola. `speed` es la magnitud objetivo. */
export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  speed: number;
}

// ── Creación y colocación ────────────────────────────────────────────────────

export function createPaddle(): Paddle {
  return { x: 0, y: PADDLE.y, w: PADDLE.w, h: PADDLE.h, speed: PADDLE.speed };
}

export function createBall(): Ball {
  return { x: 0, y: 0, vx: 0, vy: 0, r: BALL_RADIUS, speed: 0 };
}

/** Centra el paddle horizontalmente en la parte baja del mundo. */
export function centerPaddle(paddle: Paddle) {
  paddle.x = (WORLD.width - paddle.w) / 2;
}

/** Apoya la bola sobre el centro del paddle, sin velocidad. */
export function restBallOnPaddle(ball: Ball, paddle: Paddle) {
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.r;
  ball.vx = 0;
  ball.vy = 0;
}

/** Lanza la bola hacia arriba con la velocidad actual (vertical dominante). */
export function launchBall(ball: Ball) {
  ball.vx = ball.speed * LAUNCH_VX;
  ball.vy = -ball.speed * LAUNCH_VY;
}

// ── Movimiento ───────────────────────────────────────────────────────────────

/** Limita el paddle al área de juego. */
function clampPaddle(paddle: Paddle) {
  const max = WORLD.width - paddle.w;
  if (paddle.x < 0) paddle.x = 0;
  else if (paddle.x > max) paddle.x = max;
}

/**
 * Mueve el paddle con `←` y `→`. El original lo movía sobre todo con el ratón y
 * dejaba el teclado de alternativa; aquí el teclado es el único control, con la
 * misma `speed` de 600 px/s.
 */
export function updatePaddle(paddle: Paddle, input: GameInput, dt: number) {
  if (input.keys.ArrowLeft) paddle.x -= paddle.speed * dt;
  if (input.keys.ArrowRight) paddle.x += paddle.speed * dt;
  clampPaddle(paddle);
}

/**
 * Integra el movimiento de la bola y la rebota en las paredes y el techo.
 *
 * La velocidad crece con el tiempo hasta el tope del nivel y reescala el vector
 * entero, así que acelerar no cambia la dirección.
 */
export function updateBall(ball: Ball, dt: number, levelIndex: number) {
  const maxSpeed = maxSpeedForLevel(levelIndex);
  const growth = growthForLevel(levelIndex);

  if (ball.speed < maxSpeed) {
    ball.speed = Math.min(maxSpeed, ball.speed + growth * dt);
    const mag = Math.hypot(ball.vx, ball.vy);
    if (mag > 0) {
      const k = ball.speed / mag;
      ball.vx *= k;
      ball.vy *= k;
    }
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // Pared izquierda.
  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx);
  }
  // Pared derecha.
  else if (ball.x + ball.r > WORLD.width) {
    ball.x = WORLD.width - ball.r;
    ball.vx = -Math.abs(ball.vx);
  }

  // Techo.
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
  }
}

// ── Colisiones ───────────────────────────────────────────────────────────────

/**
 * Resuelve la colisión bola↔paddle. Devuelve `true` si hubo rebote.
 *
 * El punto de impacto decide el ángulo de salida, hasta `MAX_BOUNCE_ANGLE` de la
 * vertical: por eso la bola nunca sale en horizontal por muy al filo que se la
 * golpee.
 */
export function ballVsPaddle(ball: Ball, paddle: Paddle): boolean {
  // Solo si la bola desciende y solapa el paddle.
  if (ball.vy <= 0) return false;

  const overlapX = ball.x + ball.r >= paddle.x && ball.x - ball.r <= paddle.x + paddle.w;
  const reachTop = ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h;
  if (!overlapX || !reachTop) return false;

  // Reposiciona la bola sobre el paddle para no re-disparar la colisión.
  ball.y = paddle.y - ball.r;

  // Punto de impacto normalizado: -1 (extremo izq) … 0 (centro) … +1 (der).
  const paddleCenter = paddle.x + paddle.w / 2;
  let offset = (ball.x - paddleCenter) / (paddle.w / 2);
  if (offset < -1) offset = -1;
  else if (offset > 1) offset = 1;

  // Ángulo proporcional al offset; se conserva la magnitud de velocidad.
  const angle = offset * MAX_BOUNCE_ANGLE;
  ball.vx = ball.speed * Math.sin(angle);
  ball.vy = -ball.speed * Math.cos(angle); // negativo → hacia arriba

  return true;
}

/** Qué pasó en el choque contra la rejilla. */
export interface BlockHit {
  /** Hubo contacto y la bola cambió de dirección. */
  bounced: boolean;
  /** El contacto destruyó un bloque rompible: quien llama suma los puntos. */
  broke: boolean;
}

const NO_HIT: BlockHit = { bounced: false, broke: false };

/**
 * Resuelve la colisión de la bola contra los bloques vivos. Resuelve por el eje
 * de menor penetración e invierte solo esa componente.
 *
 * Un bloque por llamada, como el original: resolver varias colisiones en el
 * mismo frame deja a la bola atravesando la rejilla.
 */
export function ballVsBlocks(ball: Ball, blocks: readonly Block[]): BlockHit {
  for (const b of blocks) {
    if (!b.alive) continue;

    // Descarte rápido (bola como caja de lado 2r vs. bloque).
    if (
      ball.x + ball.r <= b.x ||
      ball.x - ball.r >= b.x + b.w ||
      ball.y + ball.r <= b.y ||
      ball.y - ball.r >= b.y + b.h
    ) {
      continue;
    }

    // Penetración por cada lado del bloque.
    const overlapLeft = ball.x + ball.r - b.x;
    const overlapRight = b.x + b.w - (ball.x - ball.r);
    const overlapTop = ball.y + ball.r - b.y;
    const overlapBottom = b.y + b.h - (ball.y - ball.r);

    const minX = Math.min(overlapLeft, overlapRight);
    const minY = Math.min(overlapTop, overlapBottom);

    if (minX < minY) {
      // Colisión horizontal: reposiciona en X e invierte vx.
      if (overlapLeft < overlapRight) {
        ball.x = b.x - ball.r;
        ball.vx = -Math.abs(ball.vx);
      } else {
        ball.x = b.x + b.w + ball.r;
        ball.vx = Math.abs(ball.vx);
      }
    } else {
      // Colisión vertical: reposiciona en Y e invierte vy.
      if (overlapTop < overlapBottom) {
        ball.y = b.y - ball.r;
        ball.vy = -Math.abs(ball.vy);
      } else {
        ball.y = b.y + b.h + ball.r;
        ball.vy = Math.abs(ball.vy);
      }
    }

    // Resuelto el rebote geométrico, decidimos qué pasa con el bloque.
    if (!b.breakable) {
      // Gris: la bola rebota como en una pared; no se rompe ni suma.
      return { bounced: true, broke: false };
    }

    b.hp -= 1;
    if (b.hp > 0) {
      // Multi-golpe dañado pero no destruido: se verá más transparente.
      return { bounced: true, broke: false };
    }

    b.alive = false;
    return { bounced: true, broke: true };
  }

  return NO_HIT;
}

// ── Dibujo ───────────────────────────────────────────────────────────────────

/**
 * Radio del halo cuando la piel separa la rejilla por tinte: 4 px.
 *
 * Va **en píxeles** y no en fracción de nada, como el de Asteroids y al revés
 * que el de Tetris: allí la unidad natural era el lado de la celda, que cambia
 * entre el tablero y la banda de la siguiente, y aquí el mundo mide siempre
 * `WORLD` y nada se escala —el bloque es de 66,6 × 24, el paddle de 162 × 14 y
 * la bola de radio 8, y esos números no dependen de nada—. Una fracción del
 * tamaño de la entidad además repartiría al revés de lo que conviene: le daría
 * el radio más largo al bloque, que es justo el que tiene vecinos pegados, y el
 * más corto a la bola, que va suelta.
 *
 * Lo que manda el número es el **hueco entre dos bloques contiguos**, que son
 * los 6 px de `GAP_X`/`GAP_Y` y es lo único que separa un bloque del de al lado.
 * Aquí se ilumina un relleno y no un trazo, así que el radio entero sale hacia
 * fuera del borde —de ahí que sea la mitad que los 8 px de Asteroids, donde la
 * mitad del aura cae dentro del propio trazo—. Con 4 px, en el centro del surco
 * cada bloque aporta menos de un 7% de su brillo y la cuadrícula se sigue
 * leyendo como cuadrícula; con 6 ya son casi dos décimas por lado y las diez
 * columnas se funden en una banda.
 */
const GLOW_BLUR = 4;

/**
 * El radio corto, para una piel cuya rejilla entera comparte color: 2 px.
 *
 * Ahí el tinte ya no distingue nada y lo único que queda es el escalón: los
 * rompibles en `#22aa22` y el gris irrompible un escalón por debajo, en
 * `#116611`. Y esos dos se tocan de verdad —el nivel 9 alterna `3a3a3a3a3a`, así
 * que cada irrompible tiene un rompible pegado a cada lado—: con 4 px, el aura
 * del vecino invade el borde del irrompible y lo empuja hacia el escalón medio.
 * Rompible contra irrompible es la distinción que decide la partida, porque de
 * ella depende si una pantalla se puede despejar, así que el radio se acorta
 * hasta que el aura muere dentro del surco. Es además lo que hace un fósforo de
 * verdad: sangra corto y pegado al relleno, y el letrero de neón sangra amplio.
 */
const GLOW_BLUR_TIGHT = 2;

/**
 * Cuánto halo pide esta piel.
 *
 * **La piel dice si hay halo y el motor dice de cuánto**, que es la misma
 * frontera que ya rige el alfa. El motor mide mirando la paleta que tiene
 * delante y no el nombre de la piel —a estas funciones llega una `Palette` y
 * nunca un `SkinId`, así que ni podría—: lo que obliga a acortar el radio no es
 * que la piel se llame `retro`, es que sus bloques rompibles sean todos del
 * mismo color, y entonces lo único que los separa del irrompible es el brillo,
 * que es justo lo que un halo largo funde. Una cuarta piel monocroma se
 * resolvería sola.
 *
 * El irrompible se queda fuera de la comparación a propósito: es el bloque con
 * el que se contrasta, no uno de los comparados.
 *
 * El mismo radio vale para las tres cosas que se pintan. El paddle y la bola no
 * imponen ninguna restricción propia —ninguno tiene un vecino a 6 px—, pero la
 * bola **cruza la rejilla**, así que su aura cae en los mismos surcos y no puede
 * ser más larga que la que ellos toleran.
 */
function glowSpread(p: Palette): number {
  for (const kind of BLOCK_KINDS) {
    if (kind === UNBREAKABLE_LETTER) continue;
    if (p.blocks[kind] !== p.blocks.r) return GLOW_BLUR;
  }
  return GLOW_BLUR_TIGHT;
}

/**
 * Bloques vivos. El alpha comunica el desgaste de los multi-golpe: intacto
 * (`hp === maxHp`) → 1,0; baja con cada golpe hasta un mínimo de 0,4. Ya era una
 * primitiva en el original y no un sprite, así que se copia tal cual.
 *
 * El halo no le quita nada a ese desgaste: se enciende dentro del mismo
 * `save()`/`restore()` que fija el `globalAlpha`, así que el aura sale igual de
 * apagada que el relleno y un bloque tocado se sigue leyendo más tenue que uno
 * intacto. Y ese `restore()` es también quien suelta el halo: `shadowColor` y
 * `shadowBlur` son estado global del contexto, como el alfa, y salen de la misma
 * pareja que ya estaba escrita aquí.
 */
export function drawBlocks(ctx: CanvasRenderingContext2D, blocks: readonly Block[], p: Palette) {
  const blur = p.glow ? glowSpread(p) : 0;
  for (const b of blocks) {
    if (!b.alive) continue;
    const color = p.blocks[b.kind];
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.6 * (b.hp / b.maxHp);
    ctx.fillStyle = color;
    if (p.glow) glow(ctx, color, blur);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
}

export function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle, p: Palette) {
  ctx.fillStyle = p.paddle;
  // Aquí no hay `restore()` que suelte el halo, así que se apaga a mano: si no,
  // lo hereda lo siguiente que se pinte en este frame.
  if (p.glow) glow(ctx, p.paddle, glowSpread(p));
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  if (p.glow) noGlow(ctx);
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, p: Palette) {
  ctx.fillStyle = p.ball;
  if (p.glow) glow(ctx, p.ball, glowSpread(p));
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  if (p.glow) noGlow(ctx);
}
