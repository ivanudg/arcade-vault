// Menú de pausa: overlay interactivo con botón de reanudar y selector de nivel.
// Todo en coordenadas del MUNDO LÓGICO; el clic llega ya convertido (ver screenToWorld).

import { WORLD, LEVELS } from "./config.js";
import { game } from "./state.js";

// --- Geometría de los botones (mundo lógico) ---
const RESUME = { x: (WORLD.w - 240) / 2, y: 150, w: 240, h: 54 };

// Rejilla del selector de nivel: 5 columnas × 2 filas para los 10 niveles.
const COLS = 5;
const CELL_W = 90;
const CELL_H = 60;
const GAP = 16;
const GRID_W = COLS * CELL_W + (COLS - 1) * GAP;
const GRID_X = (WORLD.w - GRID_W) / 2;
const GRID_Y = 300;

// Rect del botón del nivel `i` (0-based) dentro de la rejilla.
function levelRect(i) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return {
    x: GRID_X + col * (CELL_W + GAP),
    y: GRID_Y + row * (CELL_H + GAP),
    w: CELL_W,
    h: CELL_H,
  };
}

// ¿El punto (x, y) del mundo cae dentro del rect r?
function inside(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

// Dibuja un botón rectangular con etiqueta; `highlight` resalta el nivel actual.
function drawButton(ctx, r, label, highlight) {
  ctx.fillStyle = highlight ? "#3a3a7a" : "#1e1e44";
  ctx.strokeStyle = highlight ? "#8888ff" : "#4a4a80";
  ctx.lineWidth = 2;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeRect(r.x, r.y, r.w, r.h);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
}

// Dibuja el menú de pausa completo. Llamar tras el overlay oscuro.
export function drawPauseMenu(ctx) {
  ctx.save();

  ctx.fillStyle = "#ffffff";
  ctx.font = "56px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PAUSA", WORLD.w / 2, 90);

  drawButton(ctx, RESUME, "Reanudar", false);

  ctx.fillStyle = "#c8c8ff";
  ctx.font = "22px monospace";
  ctx.fillText("Elige un nivel para empezar", WORLD.w / 2, 262);

  for (let i = 0; i < LEVELS.length; i++) {
    drawButton(ctx, levelRect(i), String(i + 1), i === game.levelIndex);
  }

  ctx.restore();
}

// Resuelve un clic (coords del mundo) a una acción del menú:
//   "resume" · un índice de nivel (número 0-based) · null si no acertó ningún botón.
export function handlePauseClick(x, y) {
  if (inside(RESUME, x, y)) return "resume";
  for (let i = 0; i < LEVELS.length; i++) {
    if (inside(levelRect(i), x, y)) return i;
  }
  return null;
}
