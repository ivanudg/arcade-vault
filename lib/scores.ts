/**
 * Puntuaciones: semilla fija por máquina más las marcas que guarda este
 * dispositivo. Puerto de `SEED` / `DATES` / `board` / `best` / `addScore`
 * de references/templates/arcade-core.js.
 */

import { GAMES, type GameId } from "@/lib/games";
import { persist, read } from "@/lib/storage";

export interface ScoreEntry {
  name: string;
  score: number;
  /** Texto `dd/mm/aa`; lo genera `addScore()` en el cliente al guardar. */
  date: string;
}

export interface BoardRow extends ScoreEntry {
  /** Del dispositivo que la guardó. `null` en las semillas. */
  deviceId: string | null;
  /** `true` si la marca la guardó este dispositivo. Lo resuelve el cliente. */
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
  // La única máquina con motor: aquí las cifras salen de partidas de verdad, no
  // del prototipo. Rango 1.500–9.000, para que una buena partida entre en el top
  // 10 y una excelente llegue al podio. Si la realidad se desvía se ajusta esta
  // tabla, nunca las constantes del juego.
  asteroids: [
    ["VECTOR", 8940],
    ["NOVA_7", 7620],
    ["ORION", 6480],
    ["LYRA", 5510],
    ["DEIMOS", 4720],
    ["QUASAR", 3960],
    ["TALIA", 3240],
    ["CERES", 2580],
    ["OMEGA_3", 1980],
    ["JUNO", 1540],
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

/** Mezcla semilla y marcas propias: de mayor a menor y recortada a 10 filas. */
function rows(id: GameId, stored: ScoreEntry[]): BoardRow[] {
  const seed: BoardRow[] = (SEED[id] ?? []).map((r) => ({ ...r, deviceId: null, mine: false }));
  const mine: BoardRow[] = stored.map((r) => ({ ...r, deviceId: null, mine: true }));
  return seed
    .concat(mine)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * Tabla de una máquina, con las marcas de este dispositivo incluidas.
 * Una marca propia que baje del top 10 simplemente deja de verse.
 */
export function board(id: GameId): BoardRow[] {
  return rows(id, read().scores?.[id] ?? []);
}

/**
 * La tabla contando sólo las semillas.
 *
 * Es lo único que puede pintar el servidor, donde no hay `localStorage`. Los
 * componentes de cliente arrancan con esto y pasan a `board()` tras montar:
 * así las semillas se ven siempre y no hay aviso de hidratación.
 */
export function seedBoard(id: GameId): BoardRow[] {
  return rows(id, []);
}

/** Mejor marca ya formateada, o `'—'` si la máquina no tuviera ninguna. */
export function best(id: GameId): string {
  const top = board(id)[0];
  return top ? formatScore(top.score) : "—";
}

/** Igual que `best()` pero sólo con semillas: el valor que pinta el servidor. */
export function seedBest(id: GameId): string {
  const top = seedBoard(id)[0];
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

/* -------------------------------------------------------------------------- */
/* Vistas transversales: las mismas marcas leídas a lo ancho de las máquinas.  */
/* -------------------------------------------------------------------------- */

/** Marcas guardadas en este dispositivo, tal como las devuelve `read()`. */
type StoredScores = Partial<Record<GameId, ScoreEntry[]>>;

/** Una marca junto a la máquina donde se logró. */
export interface RecentScore extends ScoreEntry {
  game: GameId;
  /** Del dispositivo que la guardó. `null` en las semillas. */
  deviceId: string | null;
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
  mine: boolean;
}

/**
 * `'12/04/26'` → `20260412`: un entero que ordena igual que la fecha.
 * El siglo se asume `20xx`, que es lo único que puede escribir `today()`.
 * Un texto que no sea `dd/mm/aa` cae al final, como fecha desconocida.
 */
function dateKey(date: string): number {
  const [d, m, y] = date.split("/").map(Number);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return 0;
  return (2000 + y) * 10000 + m * 100 + d;
}

/** Semillas y marcas propias de las ocho máquinas, en el orden de `GAMES`. */
function allScores(stored: StoredScores): RecentScore[] {
  return GAMES.flatMap((g) => [
    ...(SEED[g.id] ?? []).map((r) => ({ ...r, game: g.id, deviceId: null, mine: false })),
    ...(stored[g.id] ?? []).map((r) => ({ ...r, game: g.id, deviceId: null, mine: true })),
  ]);
}

/**
 * De más reciente a más vieja. Las diez fechas semilla se repiten en las ocho
 * máquinas, así que el desempate importa: primero la fecha, luego la
 * puntuación mayor y, en último término, el orden de `GAMES` — que es el de
 * `allScores()` y sobrevive porque `sort()` es estable.
 */
function recent(stored: StoredScores, limit: number): RecentScore[] {
  return allScores(stored)
    .sort((a, b) => dateKey(b.date) - dateKey(a.date) || b.score - a.score)
    .slice(0, limit);
}

/** Las marcas más recientes de todas las máquinas, de nueva a vieja. */
export function recentScores(limit = 7): RecentScore[] {
  return recent(read().scores ?? {}, limit);
}

/** Igual que `recentScores()` pero sólo con semillas: lo que pinta el servidor. */
export function seedRecentScores(limit = 7): RecentScore[] {
  return recent({}, limit);
}

/** Agrupa por `name` exacto y se queda con la marca mayor de cada jugador. */
function ranking(stored: StoredScores, limit: number): PlayerRank[] {
  const best = new Map<string, RecentScore>();
  for (const r of allScores(stored)) {
    const prev = best.get(r.name);
    if (!prev || r.score > prev.score) best.set(r.name, r);
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r, i) => ({
      rank: i + 1,
      name: r.name,
      score: r.score,
      game: r.game,
      deviceId: r.deviceId,
      mine: r.mine,
    }));
}

/** Ranking global por la mejor marca de cada nombre. */
export function topPlayers(limit = 5): PlayerRank[] {
  return ranking(read().scores ?? {}, limit);
}

/** Igual que `topPlayers()` pero sólo con semillas: lo que pinta el servidor. */
export function seedTopPlayers(limit = 5): PlayerRank[] {
  return ranking({}, limit);
}
