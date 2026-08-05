/**
 * Catálogo de máquinas del vault.
 *
 * Nació como puerto literal de `GAMES` en references/templates/arcade-core.js,
 * con las ocho máquinas del prototipo. Desde SPEC 07 queda una, `asteroids`,
 * porque es la única que se juega de verdad: las otras ocho eran escena
 * congelada y HUD de mentira, y un vault que enseña nueve y deja jugar una
 * promete ocho veces más de lo que da. **Toda máquina que entre a partir de
 * aquí entra con motor.**
 *
 * `getGame()` devuelve `undefined` en vez de la primera máquina cuando el id no
 * existe, para que las rutas dinámicas puedan responder 404.
 */

/**
 * Unión de un miembro, no un alias de `"asteroids"`: sigue siendo unión, así
 * que la próxima máquina entra añadiendo un literal y no reescribiendo el tipo.
 */
export type GameId = "asteroids";

/**
 * Vocabulario cerrado de categorías, no inventario de lo que hay hoy: conserva
 * los seis valores aunque desde SPEC 07 sólo se use `DISPAROS`.
 */
export type GameCategory = "ARCADE" | "CLASICOS" | "DISPAROS" | "REFLEJOS" | "PUZZLE" | "LABERINTO";

/** Los tres neones de `globals.css`: cada máquina se pinta con uno de ellos. */
export type GameGlow = "#00f5ff" | "#ff006e" | "#f5ff00";

export interface Game {
  id: GameId;
  /** Rótulo en mayúsculas sin tilde: Press Start 2P no tiene glifos acentuados. */
  title: string;
  cat: GameCategory;
  /** Color de acento de la máquina. */
  glow: GameGlow;
  /** `false` en una máquina en mantenimiento. Hoy no hay ninguna. */
  playable: boolean;
  /** Una línea, para la tarjeta de la biblioteca. */
  desc: string;
  /** Párrafo de la ficha. */
  long: string;
  /** Línea de controles de la ficha. */
  controls: string;
}

export const GAMES: readonly Game[] = [
  {
    id: "asteroids",
    title: "ASTEROIDS",
    cat: "DISPAROS",
    glow: "#f5ff00",
    playable: true,
    desc: "Pulveriza el campo de asteroides y sobrevive.",
    long: "El clásico de vectores, entero y jugable de verdad. Inercia real y espacio toroidal: sales por un borde y entras por el opuesto. Los asteroides grandes se parten en medianos y los medianos en pequeños, y cuanto más pequeños, más puntos. Cada nivel suelta dos de los cuatro potenciadores —disparo triple, escudo, cámara lenta e hiperpropulsión— y, con suerte, una bomba nova que limpia la pantalla.",
    controls: "Flechas ← → giran · ↑ empuja · ESPACIO dispara",
  },
];

/**
 * Busca una máquina por id. Devuelve `undefined` si no existe, para que las
 * rutas dinámicas puedan responder 404 en lugar de servir otra máquina.
 */
export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

/**
 * Un color hexadecimal con transparencia, como el `tint()` del prototipo.
 * Los velos y halos se calculan con esto porque el color no se conoce hasta el
 * render y no puede salir de una clase estática. Acepta cualquier `#rrggbb`:
 * además de los acentos de máquina, lo usan los colores del podio.
 */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
