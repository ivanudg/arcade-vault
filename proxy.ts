/**
 * Refresco de la sesión de Supabase en cada petición.
 *
 * En Next 16 esto es `proxy.ts` y no `middleware.ts`: mismo archivo, mismo
 * sitio —la raíz del repo, al nivel de `app/`— y mismo cometido, con otro
 * nombre. Corre en el runtime de Node y no admite `runtime` en su `config`.
 *
 * Qué hace y por qué: el token de acceso de Supabase caduca, y quien lo renueva
 * es el cliente que tiene delante las cookies. Un Server Component no puede
 * escribirlas —por eso `lib/supabase/server.ts` se traga el error de `setAll()`—
 * así que sin esto la sesión sólo se refrescaría en el navegador y el servidor
 * acabaría viendo a un invitado donde hay una cuenta. Aquí sí se pueden
 * escribir: la respuesta se construye con las cookies actualizadas.
 *
 * Qué **no** hace: proteger rutas. Hoy no hay ninguna que lo pida —el vault se
 * juega desde el primer clic, sin cuenta— y la documentación de Next avisa de
 * que el proxy no es el sitio para la autorización. La comprobación de verdad
 * vive donde se escribe: en la Server Action que guarda la marca y en la RLS.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  // Sin credenciales, la petición pasa tal cual. Es lo contrario de lo que hace
  // `lib/supabase/env.ts`, y a propósito: lanzar aquí tumbaría el sitio entero,
  // incluidas las siete pantallas que no hablan con Supabase. No se finge una
  // sesión, simplemente no se refresca.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  // Se reasigna dentro de `setAll()`: cuando Supabase renueva el token hay que
  // rehacer la respuesta sobre la petición ya modificada, o el resto de la
  // cadena seguiría leyendo las cookies viejas.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // `getUser()` y no `getSession()`: éste va al servidor de Supabase a validar
  // el token, y de paso es lo que dispara la renovación. Llamarlo es el trabajo
  // entero; su respuesta no se usa aquí.
  //
  // Si Supabase no contesta, la petición sigue su camino sin sesión refrescada.
  // Un fallo de red no puede dejar el sitio en blanco.
  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error("[proxy] no se pudo refrescar la sesión:", error);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todo menos lo que no tiene sesión que refrescar: los estáticos de Next, el
     * favicon y el único binario que sirve el vault, el atlas de frutas de
     * Snake. Refrescar la sesión ahí sería una llamada de red por imagen.
     */
    "/((?!_next/static|_next/image|favicon.ico|snake/fruits\\.png).*)",
  ],
};
