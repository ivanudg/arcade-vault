/**
 * Persistencia del vault en `localStorage`.
 *
 * Nadie más toca `localStorage` directamente. Aquí ya sólo quedan la sesión y
 * el identificador de este navegador: desde SPEC 06 las puntuaciones viven en
 * Supabase.
 *
 * La clave sigue siendo la del prototipo. Estrenar una `v2` para tirar el campo
 * `scores` habría cerrado la sesión a todo el mundo por un campo que ya no lee
 * nadie; lo que hubiera guardado se queda ahí hasta que el navegador lo tire.
 */

/** La versión va en la clave: un cambio de esquema estrena clave y olvida lo viejo. */
const KEY = "arcadevault:v1";

export interface VaultUser {
  name: string;
  guest: boolean;
}

export interface VaultData {
  user?: VaultUser | null;
  /** UUID de este navegador. Lo crea `deviceId()` la primera vez. */
  deviceId?: string;
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
