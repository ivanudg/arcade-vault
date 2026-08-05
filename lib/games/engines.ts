/**
 * Qué máquinas tienen motor de verdad.
 *
 * Es de donde `PlayCabinet` saca el motor que monta. El registro sigue siendo
 * parcial por tipo, pero desde SPEC 07 toda máquina del catálogo tiene el suyo:
 * una entrada que faltase dejaría su pantalla de juego sin nada que enseñar.
 *
 * Para añadir un motor: implementar `GameMount` (ver `lib/games/engine.ts`) y
 * añadir aquí una línea.
 */

import { asteroidsGame } from "@/lib/games/asteroids";
import { tetrisGame } from "@/lib/games/tetris";
import type { GameMount } from "@/lib/games/engine";
import type { GameId } from "@/lib/games";

export const ENGINES: Partial<Record<GameId, GameMount>> = {
  asteroids: asteroidsGame,
  tetris: tetrisGame,
};
