/**
 * Fuente de entrada compartida por todos los motores.
 *
 * Puerto del bloque `Input` de `references/started-games/02-asteroids/game.js`
 * con dos diferencias, ambas por vivir dentro de una SPA:
 *
 * - Los listeners se enganchan y se sueltan (`attach()` / `detach()`), en vez de
 *   quedarse en `window` para siempre. El `preventDefault` de las flechas y
 *   `Space` solo actúa mientras están enganchados; el original secuestraba el
 *   scroll de la página entera.
 * - `press()` / `release()` inyectan las mismas teclas desde el mando táctil,
 *   así que el motor no distingue entre teclado y botones en pantalla.
 */

/** Las únicas teclas cuyo comportamiento por defecto se anula. */
const BLOCKED = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

export interface GameInput {
  /** Teclas mantenidas. `true` mientras la tecla está abajo. */
  readonly keys: Record<string, boolean>;
  /** Flanco de bajada de un solo uso: la primera lectura lo consume. */
  pressed(code: string): boolean;
  /** Mantiene una tecla desde el mando táctil, como un `keydown`. */
  press(code: string): void;
  /** Suelta una tecla del mando táctil, como un `keyup`. */
  release(code: string): void;
  /** Engancha los listeners de `window`. Llamarlo dos veces no duplica nada. */
  attach(): void;
  /** Suelta los listeners y olvida las teclas mantenidas. Idempotente. */
  detach(): void;
}

export function createInput(): GameInput {
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};
  let attached = false;

  function down(code: string) {
    if (!keys[code]) justPressed[code] = true;
    keys[code] = true;
  }

  function up(code: string) {
    keys[code] = false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (BLOCKED.has(e.code)) e.preventDefault();
    down(e.code);
  }

  function onKeyUp(e: KeyboardEvent) {
    up(e.code);
  }

  return {
    keys,

    pressed(code) {
      const val = justPressed[code] ?? false;
      justPressed[code] = false;
      return val;
    },

    press: down,
    release: up,

    attach() {
      if (attached) return;
      attached = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
    },

    detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      // Sin listeners no llega el `keyup`: una tecla mantenida al pausar se
      // quedaría abajo y la nave giraría sola al reanudar.
      for (const code of Object.keys(keys)) keys[code] = false;
      for (const code of Object.keys(justPressed)) justPressed[code] = false;
    },
  };
}
