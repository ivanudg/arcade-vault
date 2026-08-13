/**
 * Las tres pieles de Tetris.
 *
 * Once ranuras: los siete tetrominós, la rejilla, el fondo, el rótulo de la
 * banda y el brillo de la celda. Cuatro de ellas eran literales sueltos fuera de
 * `constants.ts` —el `"#000"` del fondo, el gris del rótulo `SIG.` y el
 * `rgba(255,255,255,0.12)` del brillo, más la rejilla, que sí estaba pero también
 * pinta la línea que separa la banda—, y por eso la paleta vive aquí.
 *
 * **El alfa no es de la piel.** El brillo se pinta al 0,12 y la proyección de
 * aterrizaje al 0,2: los dos los sigue decidiendo el motor. Aquí sólo está el
 * color, y por eso `gloss` va en `#rrggbb` de seis dígitos, que es lo único que
 * `tint()` acepta. La proyección no es ranura: reusa el color de su pieza.
 *
 * `clasico` es extracción, no diseño: cada hex se puede señalar en el código que
 * había antes de vestir la máquina, así que elegirla deja la partida exactamente
 * como estaba.
 */

import type { SkinId } from "@/lib/games/skins";

/**
 * Color de cada tipo de pieza, indexado por el valor de la celda. El hueco del
 * 0 —la celda vacía— se conserva del original: las matrices de `PIECES` llevan
 * el número del tipo dentro, y desplazar el índice obligaría a restar uno en
 * cada dibujo.
 */
export type PieceColors = readonly [
  null,
  string, // 1 · I
  string, // 2 · O
  string, // 3 · T
  string, // 4 · S
  string, // 5 · Z
  string, // 6 · J
  string, // 7 · L
];

export interface Palette {
  /** El lienzo. Se pinta opaco cada frame, así que borra el anterior. */
  bg: string;
  /** Los siete tetrominós, en el tablero, en mano y en la banda de la siguiente. */
  pieces: PieceColors;
  /** Las líneas interiores del tablero y la que separa la banda derecha. */
  grid: string;
  /** El rótulo `SIG.` sobre la pieza siguiente. */
  label: string;
  /** La banda de brillo de cada celda. El motor le pone su 0,12. */
  gloss: string;
}

/**
 * `neon` reparte los cuatro acentos `--av-*` entre las cuatro piezas que ya
 * tiraban a ese tono —I al cian, O al amarillo, T al magenta, L al ámbar— y baja
 * las tres restantes a la rampa de grises del tema, en tres escalones bien
 * separados. Es lo único que cabe sin repetir color: hay siete piezas y sólo
 * cuatro acentos, y los grises son tokens del tema igual que ellos.
 *
 * `retro` es la que no cabe: siete piezas y tres escalones vivos. Las siete
 * comparten el escalón `vivo` y se distinguen por su forma, que es literalmente
 * lo que es un tetrominó. Ninguna regla del juego depende del color de una
 * pieza —no hay combos por tinte ni bloques especiales—, y lo que sí importa
 * (celda ocupada contra celda vacía, y la proyección contra el tablero, que va
 * por alfa) se conserva entero. La rejilla baja a `tenue` y el rótulo se queda en
 * `medio`, así que la banda derecha mantiene sus tres cosas en tres escalones.
 * En fósforo monocromo el brillo de la celda se pierde: no hay blanco en la
 * rampa y S6 no admite inventarlo. Es fiel a un monitor verde de verdad.
 */
export const PALETTES: Record<SkinId, Palette> = {
  clasico: {
    bg: "#000",
    pieces: [
      null,
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#64b5f6", // J - azul pálido
      "#ffb74d", // L - orange
    ],
    grid: "#22222e",
    label: "#8b8b99",
    gloss: "#ffffff",
  },
  neon: {
    bg: "#0a0a0f",
    pieces: [
      null,
      "#00f5ff", // I - cian
      "#f5ff00", // O - amarillo
      "#ff006e", // T - magenta
      "#e7ebf5", // S - texto vivo
      "#9aa2b4", // Z - texto suave
      "#6f7686", // J - texto tenue
      "#ff9d4d", // L - ámbar
    ],
    grid: "#3d4350",
    label: "#8f97a8",
    gloss: "#e7ebf5",
  },
  retro: {
    bg: "#001100",
    pieces: [
      null,
      "#33ff33", // I
      "#33ff33", // O
      "#33ff33", // T
      "#33ff33", // S
      "#33ff33", // Z
      "#33ff33", // J
      "#33ff33", // L
    ],
    grid: "#116611",
    label: "#22aa22",
    gloss: "#33ff33",
  },
};
