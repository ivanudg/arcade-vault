/**
 * Diagnóstico de la conexión con Supabase.
 *
 * `GET /api/supabase-health` responde `200 { ok: true, url }` si el proyecto
 * contesta, y `503 { ok: false, reason }` si faltan variables o la red no
 * llega. Ninguna clave sale en la respuesta, ni la pública.
 *
 * Sin tablas no hay `select` que probar, y `auth.getUser()` sin sesión responde
 * sin tocar la red, así que la comprobación es una petición al endpoint de
 * salud de GoTrue con la clave pública en la cabecera `apikey`.
 */

import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Un proyecto pausado no debe dejar la petición colgada. */
const TIMEOUT_MS = 5000;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ ok: false, reason: "faltan variables de entorno" }, { status: 503 });
  }

  const url = supabaseUrl();

  // Construirlo ya prueba que `server.ts` y el puente de cookies funcionan, no
  // solo que la red llega.
  await createClient();

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: supabasePublishableKey() },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return Response.json({ ok: false, reason: "el proyecto no responde" }, { status: 503 });
    }
  } catch {
    // Red caída, proyecto pausado o tiempo agotado: para quien pregunta es el
    // mismo caso, y el sitio donde mirar es el panel de Supabase.
    return Response.json({ ok: false, reason: "el proyecto no responde" }, { status: 503 });
  }

  return Response.json({ ok: true, url });
}
