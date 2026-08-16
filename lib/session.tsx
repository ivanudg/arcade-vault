"use client";

/**
 * La sesión del vault, ahora de verdad.
 *
 * Hasta SPEC 15 esto era un nombre escrito en `localStorage`. Ahora es Supabase
 * Auth: la sesión viaja en cookies —`@supabase/ssr`—, así que el servidor ve lo
 * mismo que el navegador y `proxy.ts` la refresca en cada petición.
 *
 * Sigue siendo **un único contexto** montado en el layout raíz: la cabecera,
 * `/cuenta` y `/jugar` leen el mismo usuario en vez de preguntar cada una por su
 * cuenta.
 *
 * `login()` ya no está aquí. Entrar dejó de ser escribir un string y pasó a ser
 * una llamada de red que puede fallar de cuatro formas distintas, así que vive
 * en `AuthPanel`, con sus estados de envío y de error. Un contexto que sólo
 * puede devolver `void` no tiene dónde contar que el correo ya existía.
 */

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * El jugador tal y como lo ve la interfaz.
 *
 * Ya no viene de `lib/storage.ts`: el nombre es el `username` de
 * `public.profiles`, único en todo el vault y ya normalizado por la base de
 * datos —mayúsculas y doce caracteres—, y el `id` es el de `auth.users`, que es
 * lo que firma las marcas desde esta spec.
 */
export interface VaultUser {
  id: string;
  username: string;
  email: string;
}

interface Session {
  user: VaultUser | null;
  /** `false` hasta la primera respuesta de Supabase. */
  ready: boolean;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

/** Nombre de emergencia si el perfil no se puede leer. Nunca debería verse. */
const FALLBACK_NAME = "JUGADOR";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Sin credenciales no hay cliente que crear: `createClient()` lanza, y este
  // proveedor envuelve las ocho pantallas, incluidas las que no hablan con
  // Supabase. Mismo criterio que `proxy.ts`: no se finge sesión, no se pide.
  const supabase = useMemo(() => (isSupabaseConfigured() ? createClient() : null), []);

  // Dos estados y no uno, y a propósito. `authUser` es lo que dice Supabase;
  // `user` es lo que se pinta, que además necesita una consulta a `profiles`.
  // Separarlos es lo que permite que el callback de `onAuthStateChange` sea
  // síncrono: consultar la base de datos ahí dentro puede bloquearse contra el
  // propio candado de auth.
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);
  const [user, setUser] = useState<VaultUser | null | undefined>(undefined);

  // `undefined` significa "aún no ha contestado Supabase", así que `ready` se
  // deduce en vez de guardarse: un solo estado, imposible que discrepen.
  const ready = user !== undefined;

  // Quién hay: la sesión de las cookies al montar, y desde ahí lo que vaya
  // diciendo Supabase —entrar, salir, refrescar el token—.
  useEffect(() => {
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin credenciales no hay a quién preguntar
      setAuthUser(null);
      return;
    }

    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setAuthUser(data.session?.user ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  // Cómo se llama: el `username` sale de `profiles`, no del correo ni de los
  // metadatos. Depende del `id` y no del objeto entero, que Supabase reemplaza
  // en cada refresco de token y volvería a consultar sin que nada haya cambiado.
  const authId = authUser?.id;
  const email = authUser?.email ?? "";

  useEffect(() => {
    if (authUser === undefined) return;
    if (!supabase || !authId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin sesión no hay perfil que traer
      setUser(null);
      return;
    }

    let alive = true;
    void supabase
      .from("profiles")
      .select("username")
      .eq("id", authId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.error("[sesion] no se pudo leer el perfil:", error);
        // Con sesión abierta y sin perfil legible se entra igual: el trigger
        // garantiza que la fila existe, así que esto sólo pasa si la red falla,
        // y decir INVITADO a quien ha entrado sería peor que decir JUGADOR.
        setUser({ id: authId, username: data?.username ?? FALLBACK_NAME, email });
      });

    return () => {
      alive = false;
    };
  }, [supabase, authUser, authId, email]);

  const logout = useCallback(async () => {
    await supabase?.auth.signOut();
    // Los Server Components que leen el marcador se pintaron con la sesión
    // vieja; sin esto habría que recargar a mano para que se enteren.
    router.refresh();
  }, [supabase, router]);

  const value = useMemo<Session>(
    () => ({ user: user ?? null, ready, logout }),
    [user, ready, logout],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession() necesita un <SessionProvider> por encima.");
  }
  return session;
}
