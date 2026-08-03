// Estado mutable del juego: máquina de estados, partida, paddle y bola.
// Coordenadas en el mundo lógico. Convención: paddle.x/y = esquina superior-izquierda;
// ball.x/y = centro de la bola (radio r).

import { WORLD, INITIAL_LIVES, LEVELS } from "./config.js";
import { buildLevel } from "./levels.js";
import { clearExplosions } from "./explosions.js";

// Estados posibles del juego (máquina de estados).
export const GameState = {
  START: "start", // pantalla de inicio
  PLAYING: "playing", // partida en curso
  PAUSED: "paused", // partida en pausa
  LEVEL_CLEAR: "level_clear", // transición entre niveles
  GAME_OVER: "game_over",
  WIN: "win",
};

// Estado global de la partida.
export const game = {
  state: GameState.START,
  score: 0,
  lives: INITIAL_LIVES,
  levelIndex: 0,
};

// Paddle.
export const paddle = { x: 0, y: 560, w: 162, h: 14, speed: 600 };

// Bola.
export const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8, speed: 260 };

// Centra el paddle horizontalmente en la parte baja del mundo.
export function centerPaddle() {
  paddle.x = (WORLD.w - paddle.w) / 2;
}

// Coloca la bola apoyada sobre el centro del paddle, sin velocidad.
export function resetBallOnPaddle() {
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - ball.r;
  ball.vx = 0;
  ball.vy = 0;
}

// Lanza la bola hacia arriba con la velocidad actual (componente vertical dominante).
export function launchBall() {
  ball.vx = ball.speed * 0.6;
  ball.vy = -ball.speed * 0.8;
}

// Pierde una vida por caída de la bola. Si quedan vidas, recoloca y auto-relanza;
// si llega a 0, pasa a GAME_OVER y detiene la bola.
export function loseLife() {
  game.lives -= 1;
  if (game.lives <= 0) {
    game.lives = 0;
    game.state = GameState.GAME_OVER;
    ball.vx = 0;
    ball.vy = 0;
    return;
  }
  centerPaddle();
  resetBallOnPaddle();
  launchBall();
}

// Reinicia la partida completa y vuelve a la pantalla de Inicio.
export function resetGame() {
  game.score = 0;
  game.lives = INITIAL_LIVES;
  game.levelIndex = 0;
  game.state = GameState.START;
  clearExplosions(); // ningún arrastre de explosiones del intento anterior
  buildLevel(0);
  ball.speed = LEVELS[0].baseSpeed;
  centerPaddle();
  resetBallOnPaddle(); // bola en reposo sobre el paddle hasta que se lance
}

// Arranca la partida desde la pantalla de Inicio: lanza la bola y pasa a Jugando.
export function startPlaying() {
  launchBall();
  game.state = GameState.PLAYING;
}

// Empieza una partida directamente en el nivel `index` (selector del menú de pausa).
// Reinicia puntuación y vidas para un comienzo limpio en ese nivel.
export function startLevel(index) {
  game.score = 0;
  game.lives = INITIAL_LIVES;
  game.levelIndex = index;
  buildLevel(index);
  ball.speed = LEVELS[index].baseSpeed;
  centerPaddle();
  resetBallOnPaddle();
  launchBall();
  game.state = GameState.PLAYING;
}

// Alterna entre Jugando y Pausa. Solo tiene efecto durante la partida
// (ignora Inicio, transiciones y pantallas de fin).
export function togglePause() {
  if (game.state === GameState.PLAYING) {
    game.state = GameState.PAUSED;
  } else if (game.state === GameState.PAUSED) {
    game.state = GameState.PLAYING;
  }
}

// Avanza al siguiente nivel, o pasa a WIN si se completó el último.
export function advanceLevel() {
  if (game.levelIndex >= LEVELS.length - 1) {
    game.state = GameState.WIN;
    ball.vx = 0;
    ball.vy = 0;
    return;
  }
  game.levelIndex += 1;
  buildLevel(game.levelIndex);
  ball.speed = LEVELS[game.levelIndex].baseSpeed; // velocidad base del nuevo nivel
  centerPaddle();
  resetBallOnPaddle();
  launchBall();
  game.state = GameState.PLAYING;
}
