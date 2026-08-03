// Física de la bola: integración del movimiento y rebote en paredes y techo.
// (La colisión con paddle y bloques va en pasos posteriores.)

import { WORLD, maxSpeedForLevel, growthForLevel } from "./config.js";
import { ball, game } from "./state.js";

// Mueve la bola con delta-time y la rebota en las paredes izq/der y el techo.
export function updateBall(dt) {
  // Tope y crecimiento escalan con el nivel actual (fórmula lineal sobre levelIndex).
  const maxSpeed = maxSpeedForLevel(game.levelIndex);
  const growth = growthForLevel(game.levelIndex);

  // Velocidad gradual: crece hasta el tope y reescala el vector de velocidad.
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
  else if (ball.x + ball.r > WORLD.w) {
    ball.x = WORLD.w - ball.r;
    ball.vx = -Math.abs(ball.vx);
  }

  // Techo.
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
  }
}
