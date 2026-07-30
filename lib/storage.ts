/**
 * Persistencia del vault en `localStorage`.
 *
 * Es la única pieza que hay que sustituir cuando llegue el backend: nadie más
 * toca `localStorage` directamente. Misma clave que el prototipo, así que los
 * datos guardados por `references/templates/` siguen siendo válidos.
 */

import type { GameId } from "@/lib/games";
import type { ScoreEntry } from "@/lib/scores";

/** La versión va en la clave: un cambio de esquema estrena clave y olvida lo viejo. */
const KEY = "arcadevault:v1";

export interface VaultUser {
  name: string;
  guest: boolean;
}

export interface VaultData {
  user?: VaultUser | null;
  scores?: Partial<Record<GameId, ScoreEntry[]>>;
}

/**
 * Lee el bloque completo. Devuelve `{}` si no hay nada guardado, si el JSON
 * está corrupto o si `localStorage` no existe (render de servidor) o está
 * bloqueado (modo privado): la interfaz funciona igual, sólo no persiste.
 */
export function read(): VaultData {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VaultData) ?? {} : {};
  } catch {
    return {};
  }
}

/** Mezcla superficial sobre lo ya guardado, como el `persist()` del prototipo. */
export function persist(patch: Partial<VaultData>): void {
  const next: VaultData = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage bloqueado: se pierde la escritura, no la sesión en curso.
  }
}
