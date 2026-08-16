/**
 * Persistencia del vault en `localStorage`.
 *
 * Nadie más toca `localStorage` directamente. Aquí ya sólo quedan el
 * identificador de este navegador y la piel elegida en cada máquina: desde
 * SPEC 06 las puntuaciones viven en Supabase, y desde SPEC 15 la sesión también
 * —en las cookies de Supabase Auth, que es lo que permite que el servidor la
 * vea—.
 *
 * La clave sigue siendo la del prototipo. Estrenar una `v2` cada vez que se
 * jubila un campo cerraría la sesión y borraría las pieles de todo el mundo por
 * algo que ya no lee nadie; lo que un navegador viejo tenga guardado en `scores`
 * o en `user` se queda ahí hasta que él mismo lo tire.
 */

import type { SkinId } from "@/lib/games/skins";

/** La versión va en la clave: un cambio de esquema estrena clave y olvida lo viejo. */
const KEY = "arcadevault:v1";

export interface VaultData {
  /** UUID de este navegador. Lo crea `deviceId()` la primera vez. */
  deviceId?: string;
  /**
   * Piel elegida en cada máquina. La clave es el `GameId`.
   *
   * `Record<string, SkinId>` y no `Record<GameId, SkinId>` a propósito: este
   * archivo no importa del catálogo y no va a empezar por esto. Es opcional, así
   * que no invalida lo ya guardado y `KEY` sigue en `v1`: subir de versión
   * cerraría la sesión de todo el mundo por un color.
   */
  skins?: Record<string, SkinId>;
}

/**
 * Lee el bloque completo. Devuelve `{}` si no hay nada guardado, si el JSON
 * está corrupto o si `localStorage` no existe (render de servidor) o está
 * bloqueado (modo privado): la interfaz funciona igual, sólo no persiste.
 */
export function read(): VaultData {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? ((JSON.parse(raw) as VaultData) ?? {}) : {};
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

/**
 * Identificador de este navegador: lo lee o lo crea la primera vez.
 *
 * Es lo que viaja con cada marca guardada para poder resaltar las propias en el
 * marcador compartido. No identifica a una persona: es un UUID aleatorio sin
 * relación con nada más.
 *
 * Devuelve `undefined` si no se puede generar —`crypto.randomUUID()` sólo existe
 * en contexto seguro, así que probando desde el móvil por `http://192.168.x.x`
 * no está— o si `localStorage` está bloqueado. La marca se guarda igual, sin
 * dueño: se pierde un color, no una puntuación.
 */
export function deviceId(): string | undefined {
  const stored = read().deviceId;
  if (stored) return stored;
  try {
    const id = window.crypto.randomUUID();
    persist({ deviceId: id });
    return id;
  } catch {
    return undefined;
  }
}
