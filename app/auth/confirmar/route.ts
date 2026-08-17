/**
 * Canje de los enlaces que llegan por correo.
 *
 * Aquí apuntan los dos: el de confirmar el registro —que pide el `signUp()` de
 * `AuthPanel` con `emailRedirectTo`— y, desde SPEC 16, el de recuperar la
 * contraseña. Los dos llegan con `token_hash` y `type` en la query y los dos se
 * canjean con el **mismo** `verifyOtp()`; lo único que cambia es a dónde se sale
 * después, y eso lo dice el `type`.
 *
 * Que el enlace traiga `token_hash` y no el `code` de PKCE depende de las
 * plantillas de correo del panel de Supabase, que apuntan aquí con
 * `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=…`. Con las plantillas de
 * fábrica el enlace pasa por `/auth/v1/verify`, que rebota con un `code` que
 * esta ruta no entiende: la cuenta se confirma igual, pero quien lo pulsa ve el
 * aviso de enlace caducado.
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
/** El de `recovery`: hay sesión, pero lo que hace falta es un formulario. */
const NEW_PASSWORD = "/cuenta/nueva-contrasena";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  // `signup` es el del registro y `recovery` el de la contraseña; los demás
  // tipos llegarán con las specs que los estrenen, y el enlace dice cuál es.
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

  // El enlace de recuperación abre sesión de verdad, así que salir a `/cuenta`
  // enseñaría el perfil justo cuando hace falta un formulario.
  redirect(type === "recovery" ? NEW_PASSWORD : OK);
}
