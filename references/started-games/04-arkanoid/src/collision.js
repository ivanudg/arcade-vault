// Colisiones de la bola. Paso 8: bola vs. paddle con ángulo según el punto de impacto.

import { ball, paddle, game } from "./state.js";
import { blocks } from "./levels.js";
import { SCORE_PER_BLOCK } from "./config.js";
import { playBounce, playBreak } from "./audio.js";
import { spawnExplosion } from "./explosions.js";

// Ángulo máximo de salida respecto a la vertical (en los extremos del paddle).
// 60° garantiza componente vertical mínima (cos 60° = 0.5) → la bola siempre sube.
const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;

// Comprueba y resuelve la colisión bola↔paddle. Devuelve true si hubo rebote.
export function ballVsPaddle() {
  // Solo si la bola desciende y solapa el paddle.
  if (ball.vy <= 0) return false;

  const overlapX = ball.x + ball.r >= paddle.x && ball.x - ball.r <= paddle.x + paddle.w;
  const reachTop = ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h;
  if (!overlapX || !reachTop) return false;

  // Reposiciona la bola sobre el paddle para no re-disparar la colisión.
  ball.y = paddle.y - ball.r;

  // Punto de impacto normalizado: -1 (extremo izq) … 0 (centro) … +1 (extremo der).
  const paddleCenter = paddle.x + paddle.w / 2;
  let offset = (ball.x - paddleCenter) / (paddle.w / 2);
  if (offset < -1) offset = -1;
  else if (offset > 1) offset = 1;

  // Ángulo proporcional al offset; se conserva la magnitud de velocidad (ball.speed).
  const angle = offset * MAX_BOUNCE_ANGLE;
  ball.vx = ball.speed * Math.sin(angle);
  ball.vy = -ball.speed * Math.cos(angle); // negativo → hacia arriba

  playBounce();
  return true;
}

// Comprueba y resuelve la colisión de la bola contra los bloques vivos.
// Resuelve por el eje de menor penetración e invierte solo esa componente.
// Devuelve true si rompió un bloque.
export function ballVsBlocks() {
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
      // Irrompible (gris): la bola rebota como en una pared; no se rompe ni suma.
      playBounce();
      return true;
    }

    b.hp -= 1;
    if (b.hp > 0) {
      // Multi-golpe dañado pero no destruido: solo feedback de "acertaste".
      playBreak();
      return true;
    }

    // Golpe que destruye el bloque: explosión, puntos y sonido de ruptura.
    b.alive = false;
    spawnExplosion(b.x, b.y, b.w, b.h, b.color); // animación visual en el sitio del bloque
    game.score += SCORE_PER_BLOCK;
    playBreak();
    return true; // un bloque por frame para no resolver varias colisiones a la vez
  }

  return false;
}
