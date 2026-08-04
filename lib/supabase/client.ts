/**
 * Cliente de Supabase para el navegador.
 *
 * Se usa desde componentes con `"use client"`. Lee y escribe la sesión en las
 * cookies del documento, así que comparte sesión con el cliente de servidor de
 * `@/lib/supabase/server` sin que haya que sincronizar nada a mano.
 *
 * La clave que viaja aquí es la pública: lo que se pueda hacer con ella lo
 * decide RLS en el servidor, no el secreto de la clave.
 */

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Devuelve un cliente tipado con el esquema del proyecto.
 *
 * Lanza si faltan las variables de entorno: sin credenciales no se finge una
 * base de datos. Hoy `Database` no tiene tablas; cuando las tenga, basta
 * regenerarlo con `npm run supabase:types` para que el tipado aparezca solo.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
