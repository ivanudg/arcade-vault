/**
 * Vocabulario de las máquinas del vault. **Ya no es el catálogo.**
 *
 * Nació como puerto literal del catálogo de references/templates/arcade-core.js,
 * con las ocho máquinas del prototipo, y hasta SPEC 16 fue la fuente de verdad:
 * los siete campos de cada máquina se escribían aquí. Desde SPEC 17 los manda
 * `public.games` y los lee `lib/catalog.ts`, así que de aquel catálogo aquí sólo
 * quedan los **tipos** —que dicen qué forma tiene una máquina, no cuáles hay—,
 * la lista de ids y las tres ayudas de dibujo que importan los cinco motores.
 *
 * La regla de SPEC 07 sigue vigente y ahora se lee mejor: **toda máquina que
 * entre entra con motor.** Lo que el código sabe de una máquina es justo lo que
 * no cabe en una fila —su motor, su mando y su miniatura—, y por eso `GameId`
 * sigue siendo una unión cerrada de literales: editar una máquina no necesita
 * desplegar, pero añadirla sí.
 *
 * Este archivo **no** lleva `server-only` y no puede llevarlo: lo importan los
 * cinco motores y cuatro componentes de cliente.
 */

/**
 * Una máquina nueva entra añadiendo un literal aquí, su entrada en `GAME_IDS` y
 * una fila en `public.games`.
 */
export type GameId = "asteroids" | "tetris" | "arkanoid" | "snake" | "frogger";

/**
 * Los ids que existen, sin sus datos.
 *
 * No es una copia disimulada del catálogo: no lleva ni un dato editable. Existe
 * porque hay tres sitios que necesitan saber si un id existe **sin** poder
 * consultar: `generateStaticParams()` de las dos rutas por máquina, que corre en
 * el build y no tiene ni credenciales ni red; el `IDS` de `lib/leaderboard.ts`,
 * que descarta las marcas de máquinas que ya no están y que consultando
 * duplicaría cada lectura del marcador; y `components/site-footer.tsx`, que es
 * de cliente y deduce su remate de `usePathname()`.
 */
export const GAME_IDS: readonly GameId[] = ["asteroids", "tetris", "arkanoid", "snake", "frogger"];

/**
 * Vocabulario cerrado de categorías, no inventario de lo que hay hoy: conserva
 * los seis valores aunque de momento sólo se usen `DISPAROS`, `PUZZLE`,
 * `ARCADE`, `CLASICOS` y `REFLEJOS`, que estrenó Frogger.
 */
export type GameCategory = "ARCADE" | "CLASICOS" | "DISPAROS" | "REFLEJOS" | "PUZZLE" | "LABERINTO";

/** Los tres neones de `globals.css`: cada máquina se pinta con uno de ellos. */
export type GameGlow = "#00f5ff" | "#ff006e" | "#f5ff00";

/**
 * La forma de una máquina. Los valores salen de una fila de `public.games`, que
 * `lib/catalog.ts` traduce: `desc` es la columna `tagline` y `long` es `blurb`,
 * porque `desc` es palabra reservada en PostgreSQL.
 */
export interface Game {
  id: GameId;
  /**
   * Rótulo en mayúsculas sin tilde: Press Start 2P no tiene glifos acentuados.
   * Desde SPEC 17 no es sólo disciplina, es un `check` de la tabla.
   */
  title: string;
  cat: GameCategory;
  /** Color de acento de la máquina. */
  glow: GameGlow;
  /**
   * `false` retira la máquina: desaparece de la biblioteca y de la portada, y
   * sus dos rutas responden 404. Conserva su pestaña en el salón, porque las
   * marcas ya firmadas siguen siendo verdad. Es la vía de retirada sin
   * desplegar, y se cambia desde el panel de Supabase.
   */
  playable: boolean;
  /** Una línea, para la tarjeta de la biblioteca. Es la columna `tagline`. */
  desc: string;
  /** Párrafo de la ficha. Es la columna `blurb`. */
  long: string;
  /** Línea de controles de la ficha. */
  controls: string;
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

/**
 * Enciende el halo del canvas: lo que se pinte a partir de aquí sale con un
 * resplandor de `color` y radio `blur`.
 *
 * Vive junto a `tint()` porque es su pareja: los dos son ayudas de dibujo que
 * los motores importan de `"@/lib/games"`, y los dos reparten igual la
 * responsabilidad —la piel pone el color, el motor pone el número—. Ojo con el
 * nombre: `Game.glow` es el acento de una máquina en las tarjetas y la ficha,
 * que no tiene nada que ver con esto; esto sólo toca el canvas.
 *
 * **Siempre en pareja con `noGlow()`.** El `shadow*` del contexto es estado
 * global: si no se suelta, lo hereda todo lo que se dibuje después.
 */
export function glow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

/**
 * Apaga el halo. Suelta **las dos** propiedades a propósito: con
 * `shadowBlur = 0` a secas, el contexto conserva el `shadowColor` y basta que
 * alguien vuelva a subir el radio para que reaparezca un color que ya no toca.
 * El original de `references/started-games/03-tetris/game.js:1018` lo dejó
 * escrito en un comentario y aquí es la única forma de apagarlo.
 */
export function noGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}
