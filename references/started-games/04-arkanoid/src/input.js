// Control del paddle: mouse y teclado a la vez.
// - Mouse: coloca el paddle bajo el cursor (X de viewport → mundo lógico).
// - Teclado: flechas izq/der y A/D lo desplazan a paddle.speed.

import { WORLD } from "./config.js";
import { paddle } from "./state.js";
import { screenToWorld } from "./render.js";

// Estado de teclas de movimiento.
const keys = { left: false, right: false };

// Limita el paddle al área de juego.
function clampPaddle() {
  const max = WORLD.w - paddle.w;
  if (paddle.x < 0) paddle.x = 0;
  else if (paddle.x > max) paddle.x = max;
}

function onKeyDown(e) {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
  else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
}

function onKeyUp(e) {
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
  else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
}

function onMouseMove(e) {
  const { x } = screenToWorld(e.clientX, e.clientY);
  // Centrar el paddle bajo el cursor.
  paddle.x = x - paddle.w / 2;
  clampPaddle();
}

// Engancha los listeners de entrada. Llamar una vez al arrancar.
export function initInput() {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
}

// Aplica el movimiento por teclado. Llamar cada frame con el delta-time.
export function updatePaddle(dt) {
  if (keys.left) paddle.x -= paddle.speed * dt;
  if (keys.right) paddle.x += paddle.speed * dt;
  clampPaddle();
}
