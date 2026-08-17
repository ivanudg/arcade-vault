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
 * Qué hace **además** desde SPEC 18: pre-filtrar las rutas que sin sesión no
 * llevan a ninguna parte. Es un *optimistic check* en el sentido de la
 * documentación de Next, que admite el proxy para «permission-based redirects»
 * y avisa en la misma frase de que no es una solución de autorización: **la
 * comprobación de verdad se queda donde estaba**, en la página, en la Server
 * Action que guarda la marca y en la RLS. Aquí sólo se ahorra pintar una
 * pantalla que va a rebotar.
 *
 * Y no cuesta ni una llamada de red: el `getUser()` que refresca la sesión ya
 * se hacía en cada petición, y hasta ahora su respuesta se tiraba.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Las rutas que sin sesión no tienen nada que enseñar.
 *
 * Hoy es **una**: el vault se juega desde el primer clic y sin cuenta, así que
 * las otras siete pantallas son públicas por diseño y ninguna entra aquí. Es
 * una lista y no un `if` para que la siguiente sea una línea.
 *
 * Coincidencia exacta y no prefijo: `/cuenta` es pública y lo seguirá siendo.
 */
const PROTEGIDAS = ["/cuenta/nueva-contrasena"];

/** A donde rebota quien llega sin sesión. Lo mismo que dice la página. */
const SIN_SESION = "/cuenta?error=recuperacion";

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
  // el token, y de paso es lo que dispara la renovación.
  //
  // Si Supabase no contesta, la petición sigue su camino sin sesión refrescada.
  // Un fallo de red no puede dejar el sitio en blanco.
  let contesto = false;
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    contesto = true;
  } catch (error) {
    console.error("[proxy] no se pudo refrescar la sesión:", error);
  }

  // Se rebota sólo cuando Supabase **contestó** que no hay nadie. Si la llamada
  // falló no se sabe si hay sesión, así que pasa y decide la página: rebotar por
  // un fallo de red echaría de su propia cuenta a quien la tiene.
  if (contesto && !user && PROTEGIDAS.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(SIN_SESION, request.url));
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
