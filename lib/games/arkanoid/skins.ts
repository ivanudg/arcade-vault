/**
 * Las tres pieles de Arkanoid.
 *
 * Doce ranuras: el fondo, el paddle, la bola y los nueve tipos de bloque de la
 * rejilla —las siete letras que eran `COLOR_MAP` y los dos dígitos que eran
 * `HP_COLOR`—. Dos de ellas eran fugas fuera de `constants.ts`: el `#fff` del
 * paddle y el de la bola salían del mismo `ENTITY_COLOR` de `entities.ts:57`.
 *
 * **El alfa no es de la piel.** El desgaste de un bloque multi-golpe se dibuja
 * con `globalAlpha = 0.4 + 0.6 * (hp / maxHp)`, y eso lo sigue decidiendo el
 * motor: aquí sólo está el color con el que se pinta antes de aplicarlo.
 *
 * `clasico` es extracción, no diseño. Los siete bloques de un golpe y los dos
 * multi-golpe eran **nombres de color CSS** —el original guardaba ahí el nombre
 * del recorte de su spritesheet y los siete resultaron ser colores válidos—, así
 * que se copian tal cual: convertirlos a hexadecimal sería un rediseño y la
 * partida dejaría de verse exactamente igual que antes de vestir la máquina.
 */

import type { SkinId } from "@/lib/games/skins";
import type { BlockKind } from "./constants";

export interface Palette {
  /** El lienzo. Va opaco y cubre el mundo, así que borra el frame anterior. */
  bg: string;
  /** La pala del jugador. */
  paddle: string;
  /** La bola. */
  ball: string;
  /**
   * Color de cada tipo de celda de la rejilla. Sustituye a `COLOR_MAP` y a
   * `HP_COLOR`, y conserva sus claves: las seis letras de bloque de un golpe,
   * la `a` del gris irrompible y los dígitos `2` y `3` de los multi-golpe.
   *
   * El color se resuelve **al dibujar**, no al construir el nivel: si viviera
   * dentro de cada `Block`, cambiar de piel dejaría la rejilla en curso con los
   * colores viejos hasta el nivel siguiente.
   */
  blocks: Readonly<Record<BlockKind, string>>;
}

/**
 * `neon` reparte así: los cuatro acentos `--av-*` van a los bloques con
 * significado —los dos multi-golpe conservan el cian y el magenta que ya tenían
 * en el original, y los de un golpe se reparten el resto—, y el jugador baja a
 * la rampa de grises del tema, como la nave de Asteroids. El gris irrompible se
 * va a `--av-line-strong`, el más apagado de todos: es decorado inerte y tiene
 * que leerse como tal.
 *
 * Los seis bloques de un golpe no significan nada —todos caen de un golpe y
 * valen lo mismo—, así que su reparto sólo busca que ninguno choque con otro que
 * pueda salir en su misma pantalla. El peor caso es el nivel 3, que junta cinco
 * (`r`, `c`, `m`, `g`, `h`) y ningún multi-golpe.
 *
 * `retro` separa por brillo: vivo lo que el jugador controla y mira —paddle y
 * bola—, medio la rejilla que hay que romper, tenue el gris que no se rompe
 * nunca. La distinción entre un bloque de un golpe y uno de tres se la queda el
 * `globalAlpha` del motor, que es quien ya la comunica al golpearlo.
 */
export const PALETTES: Record<SkinId, Palette> = {
  clasico: {
    bg: "#12122b",
    paddle: "#fff",
    ball: "#fff",
    blocks: {
      r: "red",
      y: "yellow",
      c: "cyan",
      m: "magenta",
      h: "hotpink",
      g: "green",
      a: "gray",
      2: "cyan",
      3: "magenta",
    },
  },
  neon: {
    bg: "#0a0a0f",
    paddle: "#c9cfdd",
    ball: "#e7ebf5",
    blocks: {
      r: "#ff9d4d",
      y: "#f5ff00",
      c: "#00f5ff",
      m: "#ff006e",
      h: "#9aa2b4",
      g: "#6f7686",
      a: "#4a5160",
      2: "#00f5ff",
      3: "#ff006e",
    },
  },
  retro: {
    bg: "#001100",
    paddle: "#33ff33",
    ball: "#33ff33",
    blocks: {
      r: "#22aa22",
      y: "#22aa22",
      c: "#22aa22",
      m: "#22aa22",
      h: "#22aa22",
      g: "#22aa22",
      a: "#116611",
      2: "#22aa22",
      3: "#22aa22",
    },
  },
};
