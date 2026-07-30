/**
 * Partida de ejemplo de `/jugar/[id]`.
 *
 * Sin motor de juego, el HUD y el fin de partida necesitan cifras que parezcan
 * de una partida real. Son fijas y por máquina a propósito: cualquier valor
 * aleatorio rompería la hidratación y dejaría los criterios de aceptación sin
 * forma de verificarse.
 *
 * Las puntuaciones caen dentro del rango de las semillas de cada máquina, así
 * que guardarlas entra en su top 10 y el circuito jugar → salón se ve. Las
 * vidas siguen lo que dice la descripción de cada juego: tres en las que las
 * anuncian, una en las que no perdonan un fallo.
 */

import type { GameId } from "@/lib/games";

export interface DemoRun {
  score: number;
  lives: number;
  level: number;
}

export const DEMO_RUN: Record<GameId, DemoRun> = {
  muro: { score: 12480, lives: 2, level: 4 },
  serpiente: { score: 6180, lives: 1, level: 3 },
  invasores: { score: 15340, lives: 2, level: 5 },
  rocas: { score: 20960, lives: 2, level: 4 },
  duelo: { score: 2600, lives: 2, level: 2 },
  corredor: { score: 7420, lives: 1, level: 3 },
  caida: { score: 9260, lives: 1, level: 4 },
  laberinto: { score: 11540, lives: 3, level: 3 },
};
