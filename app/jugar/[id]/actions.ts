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
 * Por eso mismo, desde SPEC 15 **con sesión abierta el nombre no lo pone el
 * cliente**: lo pone el `username` del perfil, y el `user_id` sale de
 * `auth.getUser()`. Si el nombre viniera de fuera, cualquiera firmaría con el de
 * otro con un POST a mano. Sin sesión se conserva el camino de siempre: el
 * nombre recibido, sus tres validaciones y `user_id` nulo.
 *
 * Y desde SPEC 16 hay un tercer caso: **sesión sin perfil**, que es como nace
 * una cuenta de Google o de GitHub. Ahí no hay nombre que poner todavía, así que
 * la marca entra como `INVITADO` y sin dueño. El nombre lo sigue poniendo el
 * servidor; simplemente aún no hay ninguno, y perder la partida sería peor.
 *
 * Lo que **no** hace, a propósito: comprobar que la puntuación sea alcanzable.
 * El marcador es falsificable y se acepta; los límites de aquí son de forma, no
 * de honestidad.
 */

import { revalidatePath } from "next/cache";
import { getGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

/** Los mismos topes que los `CHECK` de la tabla. Si cambian, cambian los dos. */
const MAX_SCORE = 10_000_000;
const MAX_NAME = 12;

/** Con quién se firma cuando no hay nombre que poner. */
const GUEST_NAME = "INVITADO";

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

  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "Esa puntuación no es válida." };
  }

  // El `device_id` es una columna `uuid`: un texto cualquiera haría fallar la
  // inserción entera. Sin dueño se guarda igual, sólo que no se resalta. Se
  // conserva junto a la cuenta: quien juega sin ella sigue viendo sus marcas
  // resaltadas, que es como funciona el vault desde SPEC 06.
  const owner = deviceId && UUID.test(deviceId) ? deviceId : null;

  try {
    const supabase = await createClient();

    // `getUser()` y no `getSession()`: éste valida el token contra Supabase en
    // vez de creerse la cookie, que es lo que hay que hacer antes de escribir.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let player: string;
    /** Quién firma la marca: la cuenta sólo cuando además tiene nombre. */
    let signer: string | null = null;

    if (user) {
      const { data: profile, error: lookup } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      // Que la consulta falle no es lo mismo que no haya fila. Lo primero es la
      // base que no contesta: no se firma con un nombre inventado ni con el del
      // cliente, la marca se pierde y se dice.
      if (lookup) {
        console.error("[marcador] no se pudo leer el perfil:", lookup);
        return { ok: false, error: "No se pudo leer tu perfil." };
      }
      // Lo segundo es una cuenta que todavía no ha elegido nombre. La marca
      // entra como invitado y sin `user_id`: sin nombre no hay a quién
      // atribuirla, y el salón la resalta por dispositivo como siempre.
      player = profile?.username ?? GUEST_NAME;
      signer = profile ? user.id : null;
    } else {
      // La misma norma que aplica el registro: mayúsculas y doce caracteres. Un
      // nombre de sólo espacios se queda en nada y no entra.
      player = name.trim().toUpperCase().slice(0, MAX_NAME);
      if (!player) {
        return { ok: false, error: "Escribe un nombre para firmar la marca." };
      }
    }

    // `seeded` se deja en su valor por defecto: la política de `insert` sólo
    // admite `false`, y escribirlo aquí sería repetir lo que ya dice la tabla.
    const { error } = await supabase.from("scores").insert({
      game_id: gameId,
      player_name: player,
      score,
      device_id: owner,
      user_id: signer,
    });

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
