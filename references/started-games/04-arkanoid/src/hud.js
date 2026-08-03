// HUD: dibuja vidas, puntuación y nivel actual sobre el área de juego (mundo lógico).

import { WORLD } from "./config.js";
import { game } from "./state.js";

export function drawHud(ctx) {
  ctx.save();
  ctx.font = "20px monospace";
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";

  // Puntuación (izquierda).
  ctx.textAlign = "left";
  ctx.fillText("PUNTOS: " + game.score, 12, 10);

  // Nivel actual (centro).
  ctx.textAlign = "center";
  ctx.fillText("NIVEL " + (game.levelIndex + 1), WORLD.w / 2, 10);

  // Vidas (derecha): una pelota por cada vida, alineadas al borde derecho.
  const iconSize = 18; // tamaño de cada pelota en el HUD
  const gap = 6; // separación entre pelotas
  const y = 10;
  for (let i = 0; i < game.lives; i++) {
    // Se dibujan de derecha a izquierda desde el borde.
    const x = WORLD.w - 12 - iconSize - i * (iconSize + gap);
    drawSprite(ctx, "ball", x, y, iconSize, iconSize);
  }

  ctx.restore();
}
