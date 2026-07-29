/**
 * Puntuaciones: semilla fija por máquina más las marcas que guarda este
 * dispositivo. Puerto de `SEED` / `DATES` / `board` / `best` / `addScore`
 * de references/templates/arcade-core.js.
 */

import type { GameId } from "@/lib/games";
import { persist, read } from "@/lib/storage";

export interface ScoreEntry {
  name: string;
  score: number;
  /** Texto `dd/mm/aa`; lo genera `addScore()` en el cliente al guardar. */
  date: string;
}

export interface BoardRow extends ScoreEntry {
  /** `true` si la marca la guardó este dispositivo. */
  mine: boolean;
}

/** Fechas de las semillas, en el mismo orden que las marcas: la 1ª es la más reciente. */
const DATES = [
  "12/04/26",
  "28/03/26",
  "09/03/26",
  "21/02/26",
  "14/02/26",
  "02/02/26",
  "19/01/26",
  "07/01/26",
  "23/12/25",
  "11/12/25",
];

/** Tabla `[nombre, puntuación]` copiada literalmente del prototipo. */
const SEED_ROWS: Record<GameId, readonly (readonly [string, number])[]> = {
  muro: [
    ["NEOKID", 18420],
    ["R3TR0", 15980],
    ["LUCIA_X", 14210],
    ["DONPIXEL", 12760],
    ["MARIO_88", 11340],
    ["ZURDA", 9820],
    ["KIKO", 8410],
    ["VIOLETA", 7260],
    ["ELENA", 6180],
    ["TITO", 5040],
  ],
  serpiente: [
    ["VIBORA", 9640],
    ["SARA_9", 8720],
    ["CTRL_ALT", 7910],
    ["NANDO", 6880],
    ["PIXELINA", 6120],
    ["JOSU", 5340],
    ["ANDREA", 4610],
    ["RUBEN", 3980],
    ["MAR", 3220],
    ["IVAN", 2640],
  ],
  invasores: [
    ["ORBITA", 24680],
    ["CAPI_Z", 21440],
    ["LAIA", 19870],
    ["GUS", 17250],
    ["DIEGO_R", 15600],
    ["NURIA", 13980],
    ["BEA", 12100],
    ["OSCAR", 10420],
    ["PACO", 8760],
    ["LOLA", 7140],
  ],
  rocas: [
    ["ASTRA", 31200],
    ["DUNA", 27640],
    ["KAI", 24980],
    ["ROCIO", 22310],
    ["TOMAS", 19740],
    ["SILVIA", 17020],
    ["BRUNO", 14680],
    ["NOA", 12240],
    ["HUGO", 9910],
    ["EMMA", 7830],
  ],
  duelo: [
    ["PALA_X", 4200],
    ["CARLA", 3800],
    ["MENDI", 3400],
    ["RAUL_7", 3100],
    ["NEREA", 2700],
    ["TONI", 2300],
    ["JULIA", 1900],
    ["ABEL", 1600],
    ["SAM", 1200],
    ["NIL", 900],
  ],
  corredor: [
    ["VELOZ", 12840],
    ["MARTA_R", 11260],
    ["KEVIN", 9980],
    ["AITOR", 8740],
    ["CLARA", 7620],
    ["IZAN", 6480],
    ["PILAR", 5310],
    ["BORJA", 4260],
    ["ROC", 3180],
    ["ELSA", 2140],
  ],
  caida: [
    ["TETRO", 14200],
    ["ANA_L", 12680],
    ["JAVI", 10940],
    ["CARMEN", 9320],
    ["LEO", 8100],
    ["MIRA", 6840],
    ["SAUL", 5620],
    ["ITZI", 4380],
    ["POL", 3260],
    ["UNAI", 2180],
  ],
  laberinto: [
    ["GLOTON", 16880],
    ["ROSA", 14320],
    ["ALEX_P", 12760],
    ["CHEMA", 11040],
    ["SOFIA", 9580],
    ["DANI", 8210],
    ["LUZ", 6940],
    ["MARCOS", 5620],
    ["IRIS", 4380],
    ["JON", 3140],
  ],
};

/** Las 10 marcas semilla de cada máquina, ya con su fecha. */
const SEED = Object.fromEntries(
  Object.entries(SEED_ROWS).map(([id, rows]) => [
    id,
    rows.map(([name, score], i) => ({
      name,
      score,
      date: DATES[i] ?? "01/01/26",
    })),
  ]),
) as Record<GameId, ScoreEntry[]>;

/** `18420` → `'18.420'`. Locale fijo para que servidor y cliente coincidan. */
export function formatScore(n: number): string {
  return n.toLocaleString("es-ES");
}

/**
 * Tabla de una máquina: semilla más marcas propias, de mayor a menor y
 * recortada a 10 filas. Una marca propia que baje del top 10 deja de verse.
 */
export function board(id: GameId): BoardRow[] {
  const stored = read().scores?.[id] ?? [];
  const seed: BoardRow[] = (SEED[id] ?? []).map((r) => ({ ...r, mine: false }));
  const mine: BoardRow[] = stored.map((r) => ({ ...r, mine: true }));
  return seed
    .concat(mine)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/** Mejor marca ya formateada, o `'—'` si la máquina no tuviera ninguna. */
export function best(id: GameId): string {
  const top = board(id)[0];
  return top ? formatScore(top.score) : "—";
}

/** Fecha de hoy como `dd/mm/aa`. Se evalúa al guardar, siempre en el cliente. */
function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

/** Añade una marca propia a `localStorage`. */
export function addScore(id: GameId, name: string, score: number): void {
  const scores = { ...read().scores };
  scores[id] = [...(scores[id] ?? []), { name, score, date: today() }];
  persist({ scores });
}
