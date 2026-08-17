/**
 * Vuelta de Google y de GitHub.
 *
 * Aquí acaba el viaje que empieza el `signInWithOAuth()` de `AuthPanel`: el
 * proveedor manda a Supabase, Supabase manda aquí con un `code` en la query, y
 * ese código se canjea por una sesión con `exchangeCodeForSession()`.
 *
 * Es una ruta **distinta** de `/auth/confirmar` y no un `if` dentro de ella: el
 * correo vuelve con un `token_hash` que se canjea con `verifyOtp()`, esto vuelve
 * con un `code` que se canjea con otra llamada. Son dos canjes que no comparten
 * nada más que el destino.
 *
 * Es un Route Handler por lo mismo que el otro: quien escribe las cookies de la
 * sesión es el servidor. Vive fuera del grupo `(vault)` porque no pinta nada.
 */

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** A dónde se llega, con sesión o con el aviso de que no se pudo. */
const OK = "/cuenta";
const FAIL = "/cuenta?error=oauth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  // Sin código no hay nada que canjear. Es lo que llega cuando alguien cancela
  // en la pantalla del proveedor: Supabase devuelve aquí con un `error` en vez
  // de con un `code`, y para quien lo ve es el mismo caso —no entró—.
  if (!isSupabaseConfigured() || !code) redirect(FAIL);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[callback] el codigo no se pudo canjear:", error.message);
    redirect(FAIL);
  }

  // Con sesión pero puede que sin nombre: una cuenta de proveedor nace sin fila
  // en `profiles`, y el panel de `/cuenta` es quien lo pide.
  redirect(OK);
}
