"use server";

/**
 * Guardado de una marca en el marcador compartido.
 *
 * Es la única escritura del vault. Vive en el servidor y no en el navegador por
 * tres razones: aquí se normaliza el nombre igual que lo hace la sesión, aquí
 * se comprueba que la máquina existe antes de chocar contra la clave ajena, y
 * aquí es donde `revalidatePath` puede hacer que la marca aparezca en el salón
 * sin recargar a mano.
 *
 * La acción vuelve a validar lo que el gabinete ya comprobó, y no por
 * desconfianza del cliente: una Server Action es una URL pública que responde a
 * cualquier POST, se llame o no desde la pantalla.
 *
 * Lo que **no** hace, a propósito: comprobar que la puntuación sea alcanzable.
 * Sin sesión el marcador es falsificable y se acepta; los límites de aquí son
 * de forma, no de honestidad.
 */

import { revalidatePath } from "next/cache";
import { getGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

/** Los mismos topes que los `CHECK` de la tabla. Si cambian, cambian los dos. */
const MAX_SCORE = 10_000_000;
const MAX_NAME = 12;

/** Lo que la acción devuelve al gabinete: o entró, o hay algo que enseñar. */
export type SaveScoreResult = { ok: true } | { ok: false; error: string };

/** Formato de `crypto.randomUUID()`. Lo que no encaje viaja como `null`. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveScore(
  gameId: string,
  name: string,
  score: number,
  deviceId?: string,
): Promise<SaveScoreResult> {
  // Una máquina que no está en el catálogo choca contra la clave ajena y
  // devuelve un 500 ilegible. Mejor pararlo aquí y decir qué pasó.
  if (!getGame(gameId)) {
    return { ok: false, error: "Esa máquina no está en el catálogo." };
  }

  // La misma norma que aplica `login()` en `lib/session.tsx`: mayúsculas y doce
  // caracteres. Un nombre de sólo espacios se queda en nada y no entra.
  const player = name.trim().toUpperCase().slice(0, MAX_NAME);
  if (!player) {
    return { ok: false, error: "Escribe un nombre para firmar la marca." };
  }

  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "Esa puntuación no es válida." };
  }

  // El `device_id` es una columna `uuid`: un texto cualquiera haría fallar la
  // inserción entera. Sin dueño se guarda igual, sólo que no se resalta.
  const owner = deviceId && UUID.test(deviceId) ? deviceId : null;

  try {
    const supabase = await createClient();
    // `seeded` se deja en su valor por defecto: la política de `insert` sólo
    // admite `false`, y escribirlo aquí sería repetir lo que ya dice la tabla.
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: player, score, device_id: owner });

    if (error) {
      console.error("[marcador] la marca no entró:", error);
      return { ok: false, error: "No se pudo guardar la marca." };
    }
  } catch (cause) {
    // Aquí acaban las credenciales que faltan y la base que no contesta.
    console.error("[marcador] no se pudo llegar a la base de datos:", cause);
    return { ok: false, error: "No hay conexión con el marcador." };
  }

  // Las cuatro pantallas que pintan marcas. La ficha se revalida por su ruta
  // concreta y no por el patrón `/juego/[id]`, que exigiría el segundo
  // argumento y revalidaría las de todas las máquinas del catálogo.
  revalidatePath("/");
  revalidatePath("/salon");
  revalidatePath("/biblioteca");
  revalidatePath(`/juego/${gameId}`);

  return { ok: true };
}
