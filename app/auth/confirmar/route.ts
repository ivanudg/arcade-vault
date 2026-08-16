/**
 * Confirmación del correo de registro.
 *
 * Aquí apunta el enlace que Supabase manda al registrarse: el `signUp()` de
 * `AuthPanel` lo pide con `emailRedirectTo`. Llega con `token_hash` y `type` en
 * la query, se canjea por una sesión con `verifyOtp()` y se acaba en `/cuenta`,
 * ya dentro.
 *
 * Es un Route Handler y no una página porque quien tiene que escribir las
 * cookies de la sesión es el servidor, y un Server Component no puede. El
 * cliente de `@/lib/supabase/server` sí, desde aquí.
 *
 * Vive fuera del grupo `(vault)` a propósito: no pinta nada, así que no
 * necesita ni cabecera ni pie. Lo único que devuelve es una redirección.
 */

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** A dónde se llega, con sesión o con el aviso de que el enlace no valía. */
const OK = "/cuenta";
const FAIL = "/cuenta?error=confirmacion";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  // `signup` es el del registro; los demás tipos llegarán con las specs que los
  // estrenen —recuperar contraseña es de la 16—, y el enlace dice cuál es.
  const type = params.get("type") as EmailOtpType | null;

  if (!isSupabaseConfigured() || !tokenHash || !type) redirect(FAIL);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  // Caducado, ya usado o manipulado: se acaba en la misma pantalla, sin sesión y
  // con el aviso. No se distingue entre los tres casos porque para quien lo
  // pulsa son el mismo: pedir otro.
  if (error) {
    console.error("[confirmar] el enlace no se pudo canjear:", error.message);
    redirect(FAIL);
  }

  redirect(OK);
}
