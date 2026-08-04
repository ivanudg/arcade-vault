/**
 * Cliente de Supabase para el servidor.
 *
 * Se usa desde Server Components, Server Actions y Route Handlers. Comparte
 * sesión con el cliente de navegador de `@/lib/supabase/client` a través de las
 * cookies de la petición.
 *
 * Es `async` porque en Next 16 `cookies()` devuelve una promesa. Nunca se
 * guarda el cliente en una variable de módulo: cada petición trae sus propias
 * cookies y reutilizarlo mezclaría sesiones entre visitantes.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Devuelve un cliente tipado con el esquema del proyecto.
 *
 * Lanza si faltan las variables de entorno: sin credenciales no se finge una
 * base de datos.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Un Server Component no puede escribir cookies, así que aquí el
          // error es el esperado y no una avería: quien renueva la sesión es
          // el navegador o un Route Handler. Cuando exista `proxy.ts` con
          // refresco de sesión, este caso deja de importar del todo.
        }
      },
    },
  });
}
