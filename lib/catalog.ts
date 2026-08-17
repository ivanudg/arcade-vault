/**
 * Consultas del catálogo. Sólo de servidor.
 *
 * Desde SPEC 17 la fuente de verdad de los siete campos de una máquina es
 * `public.games` y no `lib/games.ts`, que se queda con lo que de verdad es
 * código: los tipos, `GAME_IDS` y las tres ayudas de dibujo que importan los
 * cinco motores. Este módulo es la puerta a esa tabla.
 *
 * Va aparte de `lib/games.ts` y no dentro por el `server-only`: meterlo ahí
 * habría roto los cinco motores y los cuatro componentes de cliente que
 * importan de allí `tint()`, `glow()` y `noGlow()`.
 *
 * Regla de la casa, la misma que `lib/leaderboard.ts` lleva desde SPEC 06:
 * **ninguna función lanza**. Si la base de datos no contesta —o si no hay
 * credenciales— la consulta devuelve `null` y deja el error en la consola del
 * servidor. Las pantallas avisan de que el catálogo no está; no inventan
 * máquinas.
 *
 * Y `null` no es lo mismo que vacío: `null` es «no se pudo preguntar», la
 * lista vacía es «se preguntó y no hay máquinas». `game()` añade un tercer
 * valor con la misma lógica: `undefined` es «se preguntó y esa no está».
 */

import "server-only";

import { cache } from "react";

import { GAMES, type Game, type GameCategory, type GameGlow, type GameId } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

/** Ids que existen en el código, para no dar por buena una fila inventada. */
const IDS = new Set<string>(GAMES.map((g) => g.id));

/**
 * Las columnas que pide cualquiera de las dos lecturas.
 *
 * `tagline` y `blurb` no se llaman como el campo de TypeScript a propósito:
 * `desc` es palabra reservada en PostgreSQL y `long`, al lado de `tagline`, no
 * dice nada. La traducción la hace `toGame()` y ningún `.tsx` se entera.
 */
const COLUMNS = "id, title, cat, glow, playable, sort_order, tagline, blurb, controls";

/** Fila cruda de `public.games`. Los textos llegan como `string` pelado. */
interface RawGame {
  id: string;
  title: string;
  cat: string;
  glow: string;
  playable: boolean;
  sort_order: number;
  tagline: string;
  blurb: string;
  controls: string;
}

/**
 * No todo lo que se lanza aquí dentro es una avería.
 *
 * Next señala con excepciones cosas que no son errores —que la ruta ha usado
 * `cookies()` y no puede prerenderizarse, un `redirect()`, un `notFound()`— y
 * las reconoce por su `digest`. Aquí no es un detalle menor: un `notFound()`
 * lanzado dentro de una página que envuelve su consulta acabaría tragado, y la
 * ruta serviría un aviso de catálogo caído en lugar de un 404. Suben tal cual.
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
    console.error(`[catalogo] ${what} falló:`, error);
    return null;
  }
}

/**
 * Una fila pasada a `Game`.
 *
 * `cat` y `glow` viajan como `string` porque así los declara
 * `database.types.ts`, y se estrechan sin comprobar: los dos tienen un `check`
 * en la tabla que replica exactamente `GameCategory` y `GameGlow`, así que la
 * base de datos no deja escribir un valor que estos tipos no admitan. Añadir
 * una categoría exige tocar los dos sitios, y los dos fallan ruidosamente:
 * `tsc` uno y la base de datos el otro.
 */
function toGame(r: RawGame): Game {
  return {
    id: r.id as GameId,
    title: r.title,
    cat: r.cat as GameCategory,
    glow: r.glow as GameGlow,
    playable: r.playable,
    desc: r.tagline,
    long: r.blurb,
    controls: r.controls,
  };
}

/**
 * Todas las máquinas, ordenadas por `sort_order`. `null` si no se pudo
 * preguntar; la lista vacía si se preguntó y la tabla no tiene ninguna.
 *
 * Manda la base de datos: una fila con un `id` que el código no conoce se
 * ignora con un aviso, porque su motor, su mando y su miniatura no existen.
 * Un `GameId` sin fila desaparece del catálogo aunque su motor esté ahí.
 *
 * El desempate por `id` no es decorativo: `sort_order` no es único, y sin él
 * dos filas empatadas saldrían en un orden que puede cambiar entre peticiones.
 */
export const catalog = cache(async (): Promise<Game[] | null> => {
  return safely("catalog()", async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("games")
      .select(COLUMNS)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;

    const out: Game[] = [];
    for (const row of data ?? []) {
      if (!IDS.has(row.id)) {
        console.warn(`[catalogo] fila ignorada: '${row.id}' no es una máquina de este repo`);
        continue;
      }
      out.push(toGame(row));
    }
    return out;
  });
});

/**
 * Una máquina. `null` si no se pudo preguntar; `undefined` si no existe.
 *
 * Los tres valores son la misma distinción que el marcador lleva desde
 * SPEC 07, con uno más: `null` es «no se pudo preguntar» y `undefined` es «se
 * preguntó y no está». Sólo el segundo es un 404; el primero es un aviso.
 *
 * Un id que no está en el código ni llega a preguntarse: no hay fila que pueda
 * darle motor.
 */
export const game = cache(async (id: string): Promise<Game | null | undefined> => {
  if (!IDS.has(id)) return undefined;

  return safely(`game(${id})`, async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("games").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toGame(data) : undefined;
  });
});
