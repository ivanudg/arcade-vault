// Punto de entrada del juego (módulo ES): arranca el render y corre el game loop.

import { initRender, clear, getCtx, screenToWorld } from "./render.js";
import { game, paddle, ball, loseLife, advanceLevel, resetGame, startPlaying, togglePause, startLevel, GameState } from "./state.js";
import { handlePauseClick } from "./pauseMenu.js";
import { initInput, updatePaddle } from "./input.js";
import { blocks, remainingBlocks } from "./levels.js";
import { WORLD } from "./config.js";
import { unlockAudio } from "./audio.js";
import { drawScreens } from "./screens.js";
import { updateBall } from "./physics.js";
import { ballVsPaddle, ballVsBlocks } from "./collision.js";
import { drawHud } from "./hud.js";
import { explosions, updateExplosions, drawExplosions } from "./explosions.js";

const MAX_DT = 1 / 30; // clamp de delta-time (s) para evitar saltos enormes (pestaña en 2º plano)
const LEVEL_CLEAR_TIME = 1.2; // duración (s) de la transición entre niveles

let levelClearTimer = 0; // cuenta atrás de la transición LEVEL_CLEAR

initRender();

// Prepara la partida en la pantalla de Inicio (score/vidas/nivel iniciales, bola en reposo).
resetGame();

// Engancha el control del paddle (mouse + teclado) y la acción de estado (clic/tecla).
initInput();
initActions();

// Carga el spritesheet una vez (función global de assets/spritesheet.js).
loadSpritesheet(() => {});

// Acción del usuario (clic o Enter/Espacio) según el estado del juego.
// `e` puede traer coordenadas (clic) o venir vacío (teclado).
function onAction(e) {
  if (game.state === GameState.START) {
    unlockAudio(); // gesto de usuario → habilita el audio (política de autoplay)
    startPlaying();
  } else if (game.state === GameState.PAUSED) {
    // El menú de pausa solo responde a clics (necesita coordenadas).
    if (e && typeof e.clientX === "number") {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const action = handlePauseClick(x, y);
      if (action === "resume") togglePause();
      else if (typeof action === "number") startLevel(action); // índice de nivel elegido
    }
  } else if (game.state === GameState.GAME_OVER || game.state === GameState.WIN) {
    resetGame(); // vuelve a Inicio con todo reseteado
  }
  // PLAYING y LEVEL_CLEAR ignoran la acción.
}

function initActions() {
  window.addEventListener("click", onAction);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") onAction();
    // P o Escape → pausar/reanudar la partida en curso.
    else if (e.key === "p" || e.key === "P" || e.key === "Escape") togglePause();
  });
}

let lastTime = 0;

function frame(now) {
  // now viene en ms; lo pasamos a segundos y acotamos el paso.
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > MAX_DT) dt = MAX_DT;
  if (dt < 0) dt = 0; // primer frame

  update(dt);
  draw();

  requestAnimationFrame(frame);
}

function update(dt) {
  if (game.state === GameState.PLAYING) {
    updatePaddle(dt);
    updateBall(dt);
    ballVsPaddle();
    ballVsBlocks();
    updateExplosions(dt);

    // Caída de la bola bajo el paddle → pérdida de vida (auto-relanza o Game Over).
    if (ball.y - ball.r > WORLD.h) {
      loseLife();
    }

    // Nivel despejado → transición LEVEL_CLEAR.
    // Espera a que no queden explosiones activas para que la última se vea completa.
    if (remainingBlocks() === 0 && explosions.length === 0) {
      game.state = GameState.LEVEL_CLEAR;
      ball.vx = 0;
      ball.vy = 0;
      levelClearTimer = LEVEL_CLEAR_TIME;
    }
  } else if (game.state === GameState.LEVEL_CLEAR) {
    // Sigue avanzando las explosiones para que la última termine durante la transición.
    updateExplosions(dt);
    levelClearTimer -= dt;
    if (levelClearTimer <= 0) {
      advanceLevel(); // pasa al siguiente nivel o a WIN
    }
  }
}

function draw() {
  clear();
  const ctx = getCtx();

  // Bloques vivos del nivel. El alpha comunica el desgaste de los multi-golpe:
  // intacto (hp === maxHp) → 1.0; baja con cada golpe hasta un mínimo de 0.4.
  for (const b of blocks) {
    if (!b.alive) continue;
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.6 * (b.hp / b.maxHp);
    drawSprite(ctx, "block_" + b.color, b.x, b.y, b.w, b.h);
    ctx.restore();
  }

  // Paddle (x/y = esquina superior-izquierda).
  drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);

  // Bola (x/y = centro → dibujar desde la esquina, tamaño 2r).
  drawSprite(ctx, "ball", ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);

  // Explosiones encima de las entidades, debajo del HUD y las pantallas.
  drawExplosions(ctx);

  // HUD sobre las entidades.
  drawHud(ctx);

  // Pantalla superpuesta según el estado (Inicio, Game Over, Victoria, transición).
  drawScreens(ctx);
}

requestAnimationFrame(frame);
