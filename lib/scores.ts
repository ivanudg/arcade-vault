/**
 * Los tipos del marcador y el formato de las cifras.
 *
 * Este archivo es **isomorfo**: lo importan tanto las pantallas del servidor
 * como los componentes de cliente que las pintan, así que no toca ni la base de
 * datos ni `localStorage`. Las consultas viven en `lib/leaderboard.ts`, que es
 * `server-only`; la escritura, en `app/jugar/[id]/actions.ts`.
 *
 * Hasta SPEC 06 aquí estaban las noventa marcas semilla y las funciones que las
 * mezclaban con lo guardado en el navegador. Las semillas se mudaron a la
 * migración de siembra y el marcador dejó de ser privado por dispositivo.
 */

import type { GameId } from "@/lib/games";

export interface ScoreEntry {
  name: string;
  score: number;
  /** `dd/mm/aa`, formateado en UTC desde `created_at` para que no haya desfase. */
  date: string;
}

export interface BoardRow extends ScoreEntry {
  /** Del dispositivo que la guardó. `null` en las semillas. */
  deviceId: string | null;
  /** De la cuenta que la firmó. `null` si se jugó sin ella. */
  userId: string | null;
  /**
   * `true` si la marca es de quien mira. Lo resuelve el cliente: por cuenta si
   * hay sesión, y por dispositivo si no.
   */
  mine: boolean;
}

/** Una marca junto a la máquina donde se logró. */
export interface RecentScore extends ScoreEntry {
  game: GameId;
  /** Del dispositivo que la guardó. `null` en las semillas. */
  deviceId: string | null;
  /** De la cuenta que la firmó. `null` si se jugó sin ella. */
  userId: string | null;
  mine: boolean;
}

/** Un jugador y su mejor marca en cualquier máquina. */
export interface PlayerRank {
  /** 1 es el primero. */
  rank: number;
  name: string;
  score: number;
  /** Dónde logró esa marca. */
  game: GameId;
  /** Del dispositivo que la guardó. `null` en las semillas. */
  deviceId: string | null;
  /** De la cuenta que la firmó. `null` si se jugó sin ella. */
  userId: string | null;
  mine: boolean;
}

/** `18420` → `'18.420'`. Locale fijo para que servidor y cliente coincidan. */
export function formatScore(n: number): string {
  return n.toLocaleString("es-ES");
}
