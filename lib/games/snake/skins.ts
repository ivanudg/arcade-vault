/**
 * Las tres pieles de Snake.
 *
 * Cinco ranuras, y las cinco estaban en `constants.ts`: Snake es el motor más
 * ordenado de los cuatro y no tenía ni una fuga de color en sus archivos de
 * dibujo. Por eso la paleta se muda entera aquí y allí sólo quedan números.
 *
 * **El alfa no es de la piel.** La rejilla se pintaba con
 * `rgba(0,245,255,0.1)`: el color es de la piel y ese 0,1 lo sigue poniendo el
 * motor, que monta el `rgba` con `tint()`. Por eso `grid` va en `#rrggbb` de
 * seis dígitos, que es lo único que `tint()` acepta.
 *
 * **El atlas no se recolorea nunca.** `public/snake/fruits.png` son 22 recortes
 * a todo color y sus coordenadas son copia literal del material de origen, así
 * que teñirlos no es una opción: sería pedirle un asset nuevo a la piel. Lo que
 * hacen `neon` y `retro` es caerse al camino de respaldo que el motor **ya tiene
 * escrito** para cuando la imagen no carga —el círculo plano de `fruit`—, y eso
 * es lo que declara `useAtlas`. Es una excepción explícita de esta máquina, no
 * una pérdida silenciosa: sin ella `retro` se vería una manzana roja sobre
 * fósforo verde y dejaría de ser monocroma.
 *
 * `clasico` es extracción, no diseño: cada hex se puede señalar en el código que
 * había antes de vestir la máquina, así que elegirla deja la partida exactamente
 * como estaba, atlas incluido.
 *
 * **Desde el 2026-08-15 hay un segundo rasgo de dibujo, `glow`**, y no cambió ni
 * un hex de las tres paletas. Dice si la serpiente y la fruta salen con halo;
 * cuánto mide ese halo lo decide `entities.ts`, que es la misma frontera del
 * alfa —la piel dice si hay, el motor dice de cuánto—. Ni la rejilla ni el fondo
 * lo llevan nunca: son fondo activo y lienzo, y un aura ahí mancharía el frame.
 */

import type { SkinId } from "@/lib/games/skins";

export interface Palette {
  /**
   * El lienzo. Se pinta opaco cada frame, así que borra el anterior.
   *
   * En `clasico` es el fondo del vault y no un color propio del tablero: la
   * escena archivada que hace de miniatura se dibuja sobre él, así que la
   * partida y la miniatura se ven iguales.
   */
  bg: string;
  /** Las líneas de la rejilla del tablero. El motor les pone su 0,1. */
  grid: string;
  /** Los segmentos de la serpiente, menos la cabeza. */
  body: string;
  /** La cabeza, que es `cells[0]`. */
  head: string;
  /** La fruta cuando se pinta como círculo plano, sin atlas. */
  fruit: string;
  /**
   * Si esta piel deja usar `public/snake/fruits.png`. Sólo `clasico`: las otras
   * dos caen al círculo de `fruit`, que es el camino que el motor ya recorre
   * cuando la imagen no ha cargado. Nunca cambia la celda ni el tamaño de la
   * fruta, así que no toca el juego.
   */
  useAtlas: boolean;
  /**
   * Si los segmentos y la fruta salen con halo del color que ya tienen.
   *
   * Booleano y nada más: el radio es del motor y lo miden `GLOW_BLUR` y
   * `GLOW_BLUR_TIGHT` en `entities.ts`. No toca la celda, el inset ni la
   * hitbox; sólo el `shadowBlur` del contexto mientras se pinta.
   *
   * `false` en `clasico`, que es lo que deja la máquina como estaba. La fruta
   * del atlas **nunca** lleva halo, ni siquiera si una cuarta piel juntara
   * `useAtlas` y `glow`: `drawImage` heredaría el aura del contexto, y añadirle
   * algo al atlas es justo lo que S7 prohíbe.
   */
  glow: boolean;
}

/**
 * `neon` cambia **una** ranura, y es a propósito. Snake se pintó en SPEC 10 con
 * los tokens del vault —`--av-bg` de fondo, `--av-cyan` el cuerpo, `--av-yellow`
 * la cabeza, `--av-magenta` la fruta—, así que su `clasico` ya era casi esta
 * piel; el contrato lo avisa y no es un error. Lo que sí se corrige es la
 * rejilla: era el mismo cian del cuerpo y sólo la separaba el alfa. Aquí se
 * lleva el `--av-amber`, que es el cuarto acento y el único que la máquina no
 * usaba, y el cian queda entero para la serpiente.
 *
 * `retro` separa por brillo: medio el cuerpo, que es lo que te mata en cuanto lo
 * muerdes; vivo la cabeza, que es lo que conduces, y vivo la fruta, que es lo
 * que persigues; tenue la rejilla, que sólo decora. Cabeza y fruta comparten el
 * escalón vivo y no es un choque de S3: son un cuadrado con inset y un círculo
 * de radio 0,35, nunca ocupan la misma celda —comerla la muda— y confundirlas no
 * cuesta una vida. Lo que sí queda separado por color es la distinción que sí
 * mata: tu cuerpo nunca es del color de tu cabeza.
 *
 * Las dos encienden el halo y **no lo llevan igual de largo**, que es la
 * decisión de la ronda del 2026-08-15: en `neon` el cuerpo se funde en un tubo
 * continuo, porque la cabeza es de otro tinte y se sigue leyendo encima de él;
 * en `retro` la cabeza está a un solo escalón del cuerpo, así que el halo se
 * acorta para que la cadena de segmentos aguante y el aura del cuerpo no empuje
 * a la cabeza. El número lo pone `entities.ts` y la piel no lo sabe.
 */
export const PALETTES: Record<SkinId, Palette> = {
  clasico: {
    bg: "#0a0a0f",
    grid: "#00f5ff",
    body: "#00f5ff",
    head: "#f5ff00",
    fruit: "#ff006e",
    useAtlas: true,
    glow: false,
  },
  neon: {
    bg: "#0a0a0f",
    grid: "#ff9d4d",
    body: "#00f5ff",
    head: "#f5ff00",
    fruit: "#ff006e",
    useAtlas: false,
    glow: true,
  },
  retro: {
    bg: "#001100",
    grid: "#116611",
    body: "#22aa22",
    head: "#33ff33",
    fruit: "#33ff33",
    useAtlas: false,
    glow: true,
  },
};
