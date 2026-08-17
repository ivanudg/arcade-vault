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
import { deviceId } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * El jugador tal y como lo ve la interfaz.
 *
 * Ya no viene de `lib/storage.ts`: el nombre es el `username` de
 * `public.profiles`, único en todo el vault y ya normalizado por la base de
 * datos —mayúsculas y doce caracteres—, y el `id` es el de `auth.users`, que es
 * lo que firma las marcas desde SPEC 15.
 */
export interface VaultUser {
  id: string;
  /**
   * `null` mientras la cuenta no tenga fila en `profiles`.
   *
   * Desde SPEC 16 el trigger no crea perfil cuando el alta no trae nombre, que
   * es lo que pasa con Google y con GitHub. El nulo **es** el estado —hay sesión
   * de verdad y lo que falta es el nombre—, y decirlo en el tipo es lo que
   * obliga a `tsc` a que nadie se lo salte.
   */
  username: string | null;
  email: string;
}

interface Session {
  user: VaultUser | null;
  /** `false` hasta la primera respuesta de Supabase. */
  ready: boolean;
  logout: () => Promise<void>;
  /**
   * Vuelve a leer el perfil de la cuenta abierta.
   *
   * Existe por un solo caso: quien acaba de elegir su nombre en `/cuenta`. Esa
   * fila la escribe el navegador, así que Supabase no emite ningún evento de
   * auth y `router.refresh()` sólo alcanza a los Server Components —este
   * proveedor es de cliente y no se remonta—. Sin esto, el panel seguiría
   * pidiendo el nombre y la cabecera seguiría diciendo ELIGE NOMBRE hasta
   * recargar a mano.
   */
  refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

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

  /** La consulta a `profiles`, que hacen el efecto de abajo y `refreshProfile`. */
  const loadProfile = useCallback(
    async (id: string, mail: string): Promise<VaultUser> => {
      if (!supabase) return { id, username: null, email: mail };

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", id)
        .maybeSingle();
      if (error) console.error("[sesion] no se pudo leer el perfil:", error);

      // Sin fila no se inventa un nombre: desde SPEC 16 la ausencia es un
      // estado legítimo —una cuenta de proveedor recién creada—, y el nombre lo
      // elige quien juega en `/cuenta`. Inventarlo aquí sería firmar marcas con
      // un nombre que nadie eligió.
      return { id, username: data?.username ?? null, email: mail };
    },
    [supabase],
  );

  useEffect(() => {
    if (authUser === undefined) return;
    if (!supabase || !authId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin sesión no hay perfil que traer
      setUser(null);
      return;
    }

    let alive = true;
    void loadProfile(authId, email).then((next) => {
      if (alive) setUser(next);
    });

    return () => {
      alive = false;
    };
  }, [supabase, authUser, authId, email, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!authId) return;
    setUser(await loadProfile(authId, email));
  }, [authId, email, loadProfile]);

  const logout = useCallback(async () => {
    await supabase?.auth.signOut();
    // Los Server Components que leen el marcador se pintaron con la sesión
    // vieja; sin esto habría que recargar a mano para que se enteren.
    router.refresh();
  }, [supabase, router]);

  const value = useMemo<Session>(
    () => ({ user: user ?? null, ready, logout, refreshProfile }),
    [user, ready, logout, refreshProfile],
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

/** Lo que hace falta para saber de quién es una marca. */
interface Signed {
  deviceId: string | null;
  userId: string | null;
}

/**
 * Devuelve la prueba de «esta marca es mía», que las tres tablas del marcador
 * aplican igual.
 *
 * Con sesión manda la **cuenta**, que es lo que sobrevive al cambio de aparato;
 * sin ella manda el **dispositivo**, como desde SPEC 06. Nunca las dos a la vez:
 * quien entra deja de ver resaltadas las marcas que dejó de invitado en este
 * navegador, porque no son suyas —son de quien estuviera jugando aquí—.
 *
 * Vive aquí y no en cada tabla porque tres copias de una regla son tres sitios
 * donde puede empezar a decir cosas distintas. El servidor no la resuelve:
 * `localStorage` no lo puede leer, y una marca no puede resaltarse de dos formas
 * según quién pregunte.
 */
export function useMine(): (row: Signed) => boolean {
  const { user, ready } = useSession();
  const [device, setDevice] = useState<string>();

  // `localStorage` no existe en el render de servidor: la lectura espera al
  // efecto, y hasta entonces no se resalta nada.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras hidratar
  useEffect(() => setDevice(deviceId()), []);

  return useCallback(
    (row: Signed) => {
      if (!ready) return false;
      if (user) return row.userId !== null && row.userId === user.id;
      return device !== undefined && row.deviceId === device;
    },
    [ready, user, device],
  );
}
