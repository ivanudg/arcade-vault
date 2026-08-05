/**
 * Consultas del marcador. Sólo de servidor.
 *
 * `lib/scores.ts` se quedó con los tipos y con `formatScore()` porque los
 * importa el navegador; aquí viven las cinco lecturas contra Supabase. El
 * `server-only` no es decorativo: un componente de cliente que importe esto
 * rompe al construir en vez de arrastrar el cliente de servidor al navegador.
 *
 * Regla de la casa: **ninguna función lanza**. Si la base de datos no contesta
 * —o si no hay credenciales— la consulta devuelve `null` y deja el error en la
 * consola del servidor. Las pantallas avisan de que el marcador no está; no
 * inventan marcas.
 *
 * Y desde SPEC 07 **`null` no es lo mismo que vacío**: `null` es «no se pudo
 * preguntar», y la lista o el mapa vacíos son «se preguntó y no hay marcas».
 * Con el marcador arrancando de cero, el vacío es el estado del día uno, y
 * decirle a quien llega que el marcador no está disponible sería mentirle.
 */

import "server-only";

import { GAMES, type GameId } from "@/lib/games";
import type { BoardRow, PlayerRank, RecentScore } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

/** Ids del catálogo, para no dar por buena una `game_id` que ya no existe. */
const IDS = new Set<string>(GAMES.map((g) => g.id));

function asGameId(id: string | null): GameId | null {
  return id && IDS.has(id) ? (id as GameId) : null;
}

/**
 * `created_at` → `dd/mm/aa`, siempre en UTC.
 *
 * En UTC a propósito: la fecha se pinta en el servidor y se vuelve a pintar al
 * hidratar, y con la zona local del navegador las dos podrían no coincidir.
 */
function utcDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}`;
}

/**
 * No todo lo que se lanza aquí dentro es una avería.
 *
 * Next señala con excepciones cosas que no son errores —que la ruta ha usado
 * `cookies()` y no puede prerenderizarse, un `redirect()`, un `notFound()`— y
 * las reconoce por su `digest`. Tragárselas dejaría la página prerenderizada
 * con el aviso de marcador no disponible pegado dentro. Suben tal cual.
 */
function isNextSignal(error: unknown): boolean {
  return typeof (error as { digest?: unknown })?.digest === "string";
}

/**
 * Envuelve una consulta: devuelve `null` ante cualquier fallo, sea de red, de
 * credenciales o de la propia base de datos. Lo que la consulta devuelva —aun
 * vacío— es una respuesta y sale tal cual.
 */
async function safely<T>(what: string, run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    if (isNextSignal(error)) throw error;
    console.error(`[marcador] ${what} falló:`, error);
    return null;
  }
}

/** Fila cruda de `top_scores` / `scores`, ya con lo que interesa. */
interface RawScore {
  game_id: string | null;
  player_name: string | null;
  score: number | null;
  device_id: string | null;
  created_at: string | null;
}

/**
 * Una fila de la vista pasada a `BoardRow`.
 *
 * `mine` sale siempre `false`: el servidor no puede leer `localStorage`, así que
 * quien resuelve de quién es cada marca es el navegador tras montar.
 */
function toBoardRow(r: RawScore): BoardRow {
  return {
    name: r.player_name ?? "—",
    score: r.score ?? 0,
    date: r.created_at ? utcDate(r.created_at) : "—",
    deviceId: r.device_id,
    mine: false,
  };
}

/** Tabla de una máquina: las diez primeras marcas, de mayor a menor. */
export async function board(id: GameId): Promise<BoardRow[] | null> {
  return safely(`board(${id})`, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("top_scores")
      .select("game_id, player_name, score, device_id, created_at")
      .eq("game_id", id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toBoardRow);
  });
}

/**
 * Todas las tablas de una sola consulta.
 *
 * El salón las necesita a la vez para que cambiar de pestaña no sea otro viaje:
 * una consulta por pestaña serían tantos viajes como máquinas para enseñar lo
 * mismo. Una máquina sin marcas no aparece en el `Record`, así que un mapa
 * vacío es un marcador sin una sola marca.
 */
export async function boards(): Promise<Partial<Record<GameId, BoardRow[]>> | null> {
  return safely("boards()", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("top_scores")
      .select("game_id, player_name, score, device_id, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;

    const out: Partial<Record<GameId, BoardRow[]>> = {};
    for (const row of data ?? []) {
      const id = asGameId(row.game_id);
      if (!id) continue;
      (out[id] ??= []).push(toBoardRow(row));
    }
    return out;
  });
}

/** La mejor marca de cada máquina, sin formatear. Una sin marcas no aparece. */
export async function bests(): Promise<Partial<Record<GameId, number>> | null> {
  return safely("bests()", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("top_scores")
      .select("game_id, score")
      .eq("rank", 1);
    if (error) throw error;

    const out: Partial<Record<GameId, number>> = {};
    for (const row of data ?? []) {
      const id = asGameId(row.game_id);
      if (id && row.score !== null) out[id] = row.score;
    }
    return out;
  });
}

/** Las marcas más recientes de todas las máquinas, de nueva a vieja. */
export async function recentScores(limit = 7): Promise<RecentScore[] | null> {
  return safely("recentScores()", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scores")
      .select("game_id, player_name, score, device_id, created_at")
      .order("created_at", { ascending: false })
      .order("score", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const out: RecentScore[] = [];
    for (const row of data ?? []) {
      const id = asGameId(row.game_id);
      if (id) out.push({ ...toBoardRow(row), game: id });
    }
    return out;
  });
}

/**
 * Ranking global por la mejor marca de cada nombre.
 *
 * El agrupado por nombre lo hace la vista `player_bests`; aquí sólo se recorta y
 * se numera.
 */
export async function topPlayers(limit = 5): Promise<PlayerRank[] | null> {
  return safely("topPlayers()", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("player_bests")
      .select("game_id, player_name, score, device_id")
      .order("score", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const out: PlayerRank[] = [];
    for (const row of data ?? []) {
      const id = asGameId(row.game_id);
      if (!id) continue;
      out.push({
        rank: out.length + 1,
        name: row.player_name ?? "—",
        score: row.score ?? 0,
        game: id,
        deviceId: row.device_id,
        mine: false,
      });
    }
    return out;
  });
}
