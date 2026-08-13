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
 * color.
 */

import type { GameInput } from "@/lib/games/input";
import {
  BALL_RADIUS,
  LAUNCH_VX,
  LAUNCH_VY,
  MAX_BOUNCE_ANGLE,
  PADDLE,
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
 * Bloques vivos. El alpha comunica el desgaste de los multi-golpe: intacto
 * (`hp === maxHp`) → 1,0; baja con cada golpe hasta un mínimo de 0,4. Ya era una
 * primitiva en el original y no un sprite, así que se copia tal cual.
 */
export function drawBlocks(ctx: CanvasRenderingContext2D, blocks: readonly Block[], p: Palette) {
  for (const b of blocks) {
    if (!b.alive) continue;
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.6 * (b.hp / b.maxHp);
    ctx.fillStyle = p.blocks[b.kind];
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
}

export function drawPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle, p: Palette) {
  ctx.fillStyle = p.paddle;
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
}

export function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, p: Palette) {
  ctx.fillStyle = p.ball;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}
