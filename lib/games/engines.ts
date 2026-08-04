/**
 * Qué máquinas tienen motor de verdad.
 *
 * Es lo que consulta `PlayCabinet` para decidir entre jugar y enseñar la escena
 * congelada de `drawPreview()`. El registro es parcial a propósito: las ocho
 * máquinas simuladas siguen sin entrada y con su partida de `DEMO_RUN`.
 *
 * Para añadir un motor: implementar `GameMount` (ver `lib/games/engine.ts`) y
 * añadir aquí una línea.
 */

import { asteroidsGame } from "@/lib/games/asteroids";
import type { GameMount } from "@/lib/games/engine";
import type { GameId } from "@/lib/games";

export const ENGINES: Partial<Record<GameId, GameMount>> = {
  asteroids: asteroidsGame,
};
