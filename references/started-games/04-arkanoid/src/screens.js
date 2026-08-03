// Pantallas superpuestas según el estado del juego: Inicio, Game Over, Victoria y transición.

import { WORLD } from "./config.js";
import { game, GameState } from "./state.js";
import { drawPauseMenu } from "./pauseMenu.js";

// Capa oscura semitransparente sobre el área de juego.
function overlay(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);
}

// Texto centrado horizontalmente en la coordenada y (mundo lógico).
function centeredText(ctx, text, y, size, color) {
  ctx.font = size + "px monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, WORLD.w / 2, y);
}

// Dibuja la pantalla correspondiente al estado actual (o nada en PLAYING).
export function drawScreens(ctx) {
  ctx.save();

  switch (game.state) {
    case GameState.START:
      overlay(ctx);
      centeredText(ctx, "ARKANOID", 250, 64, "#ffffff");
      centeredText(ctx, "Clic o pulsa Enter/Espacio para empezar", 330, 22, "#c8c8ff");
      break;

    case GameState.PAUSED:
      overlay(ctx);
      drawPauseMenu(ctx);
      break;

    case GameState.LEVEL_CLEAR:
      overlay(ctx);
      centeredText(ctx, "NIVEL " + (game.levelIndex + 1) + " COMPLETADO", 280, 44, "#ffffff");
      centeredText(ctx, "Preparando el siguiente nivel...", 340, 22, "#c8c8ff");
      break;

    case GameState.GAME_OVER:
      overlay(ctx);
      centeredText(ctx, "GAME OVER", 250, 64, "#ff6464");
      centeredText(ctx, "Puntuación: " + game.score, 320, 26, "#ffffff");
      centeredText(ctx, "Clic o pulsa Enter/Espacio para reiniciar", 370, 22, "#c8c8ff");
      break;

    case GameState.WIN:
      overlay(ctx);
      centeredText(ctx, "¡VICTORIA!", 250, 64, "#64ff96");
      centeredText(ctx, "Puntuación: " + game.score, 320, 26, "#ffffff");
      centeredText(ctx, "Clic o pulsa Enter/Espacio para reiniciar", 370, 22, "#c8c8ff");
      break;
  }

  ctx.restore();
}
