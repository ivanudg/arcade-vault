"use client";

/**
 * Sesión simulada del vault.
 *
 * Un único contexto montado en el layout: la cabecera, `/cuenta` y `/jugar`
 * leen el mismo usuario en vez de tocar `localStorage` cada una por su cuenta,
 * así no pueden discrepar. No hay autenticación real: eso llega con el backend.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { persist, read, type VaultUser } from "@/lib/storage";

interface Session {
  user: VaultUser | null;
  /** `false` hasta que se ha leído `localStorage` tras hidratar. */
  ready: boolean;
  /** Normaliza el nombre como el prototipo: mayúsculas y 12 caracteres. */
  login: (name: string) => void;
  logout: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // `undefined` significa "aún no se ha leído `localStorage`", así que `ready`
  // se deduce en vez de guardarse: un solo estado, imposible que discrepen.
  const [user, setUser] = useState<VaultUser | null | undefined>(undefined);
  const ready = user !== undefined;

  // `localStorage` no existe en el render de servidor: la lectura espera al
  // efecto. Hasta que `ready` es true nadie debe pintar estado de sesión.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage tras hidratar
  useEffect(() => setUser(read().user ?? null), []);

  const login = useCallback((name: string) => {
    const next: VaultUser = { name: name.toUpperCase().slice(0, 12), guest: false };
    persist({ user: next });
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    persist({ user: null });
    setUser(null);
  }, []);

  const value = useMemo<Session>(
    () => ({ user: user ?? null, ready, login, logout }),
    [user, ready, login, logout],
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
