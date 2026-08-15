/**
 * El tablero: la rejilla de celdas ya consolidadas y todo lo que se pregunta
 * contra ella.
 *
 * Ocupa el hueco que en Asteroids ocupa `entities.ts`, pero no hay clases ni
 * nada que se mueva solo: el tablero es una matriz de `ROWS × COLS` enteros y
 * estas funciones la leen o la reescriben. Quién llama y en qué orden lo decide
 * el bucle de `index.ts`.
 *
 * El original guarda el tablero en una variable de módulo; aquí viaja por
 * parámetro, porque el estado de partida vive dentro del closure de `mount()`.
 */

import { glow, noGlow, tint } from "@/lib/games";
import { BLOCK, COLS, ROWS, type Cell } from "@/lib/games/tetris/constants";
import type { Piece } from "@/lib/games/tetris/pieces";
import type { Palette } from "@/lib/games/tetris/skins";

/** La rejilla consolidada. `board[fila][columna]`, con la fila 0 arriba. */
export type Board = Cell[][];

/** Un tablero vacío de `ROWS × COLS`. */
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<Cell>(COLS).fill(0));
}

/**
 * Si `shape` chocaría colocada en `(ox, oy)`: contra una pared, contra el suelo
 * o contra una celda ya ocupada.
 *
 * Por encima del techo no hay colisión —`ny < 0` no se comprueba contra el
 * tablero—, que es lo que deja aparecer una pieza medio fuera de la pantalla.
 */
export function collide(board: Board, shape: Cell[][], ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

/** Estampa la pieza en el tablero. A partir de aquí deja de ser la activa. */
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) board[piece.y + r][piece.x + c] = piece.shape[r][c];
    }
  }
}

/**
 * Borra las filas completas y devuelve cuántas cayeron.
 *
 * El original devolvía además una copia de cada fila borrada, con sus colores
 * reales, porque las partículas del estallido los necesitaban. Las partículas
 * no entran en esta spec, así que solo vuelve la cuenta: es lo único que la
 * puntuación mira.
 */
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<Cell>(COLS).fill(0));
      cleared++;
      r++; // reevalúa la fila que acaba de desplazarse a esta posición
    }
  }
  return cleared;
}

/** La fila donde aterrizaría la pieza si se soltara ahora. */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

/**
 * Radio del halo cuando las piezas se distinguen por su color, en fracción del
 * lado de la celda: 10,2 px con los 30 de `BLOCK`.
 *
 * El original usa `size * 0.5` y aquí se baja a propósito. Con 15 px de radio,
 * el aura de dos celdas ocupadas invade casi entero el hueco de una celda vacía
 * que quede entre ellas, y un hueco de una celda es justo lo que un jugador de
 * Tetris está leyendo todo el rato. Con 10 px el aura se apaga en el tercio
 * exterior y el centro del hueco se queda del color del fondo.
 */
const GLOW_SPREAD = 0.34;

/**
 * El radio corto, para una piel cuyas siete piezas comparten color: 3 px.
 *
 * Ahí el surco de fondo entre dos celdas contiguas es lo **único** que separa
 * una pieza de la de al lado, así que el halo no puede rellenarlo. Con 3 px de
 * radio —y el inset de 2 px, que ensancha ese surco de 2 px a 4—, cada borde
 * aporta menos de una décima parte de su brillo en el centro del surco y la
 * silueta del montón se sigue leyendo. Es además lo que hace un fósforo de
 * verdad: el sangrado de un CRT verde es corto y pegado al trazo, y el de un
 * letrero de neón es amplio.
 */
const GLOW_SPREAD_TIGHT = 0.1;

/**
 * Cuánto halo pide esta piel.
 *
 * **La piel dice si hay halo y el motor dice de cuánto**, que es la misma
 * frontera que ya rige el alfa. El motor mide mirando la paleta que tiene
 * delante y no el nombre de la piel: lo que obliga a acortar el radio no es que
 * la piel se llame `retro`, es que sus siete piezas sean del mismo color. Así
 * una cuarta piel monocroma se resolvería sola, sin tocar este archivo.
 *
 * **Se exporta para poder izarla.** Sólo depende de la paleta, así que el motor
 * la resuelve una vez al fijar la piel y pasa el resultado por parámetro: dentro
 * de un bucle de celdas su cuerpo recorría seis comparaciones por celda, hasta
 * doscientas veces por frame, para devolver siempre lo mismo.
 */
export function glowSpread(p: Palette): number {
  for (let i = 2; i <= 7; i++) {
    if (p.pieces[i] !== p.pieces[1]) return GLOW_SPREAD;
  }
  return GLOW_SPREAD_TIGHT;
}

/**
 * El alfa de la banda de brillo de `clasico`. Es del motor y no de la piel, que
 * sólo pone el color: por eso vive aquí y no en `skins.ts`.
 */
const GLOSS_ALPHA = 0.12;

/**
 * La cadena `rgba` de esa banda, ya montada.
 *
 * Sólo depende de la paleta, así que el motor la resuelve una vez al fijar la
 * piel: `tint()` hace un `parseInt` y un template string, o sea **una cadena
 * nueva por llamada**, y llamarlo dentro del bucle de celdas fabricaba hasta
 * doscientas cadenas idénticas por frame para tirarlas todas.
 */
export function glossFill(p: Palette): string {
  return tint(p.gloss, GLOSS_ALPHA);
}

/**
 * Los dos estilos de celda, en píxeles y no en coordenadas de rejilla: el
 * tablero dibuja en el origen, y la pieza siguiente en la banda derecha.
 *
 * Dos de los cuatro estilos de bloque del original, elegidos por la piel. Sin
 * halo es su `drawBlockFlat` —relleno plano con margen de un píxel y banda de
 * brillo arriba—, que es lo que la máquina pintaba antes de tener pieles y lo
 * que sigue viéndose con `clasico`, sin un píxel de diferencia. Con halo es su
 * `drawBlockNeon` (`game.js:1020`): margen de dos píxeles, resplandor del
 * propio color de la pieza y ninguna banda de brillo, porque el volumen ya lo
 * da el halo. Los otros dos estilos, el redondeado y el de píxel, no entran.
 *
 * **El halo se conmuta por lote y no por celda**, que es lo que separa estas
 * dos funciones de la `drawCell` que había antes: `shadowBlur` es la propiedad
 * más cara del contexto y encenderla y apagarla una vez por celda costaba
 * cuatro escrituras de estado por cuadrado pintado.
 */

/**
 * El tablero consolidado. El halo se conmuta **cuando cambia el color**, no una
 * vez por celda: se enciende en la primera celda ocupada y se suelta con un
 * único `noGlow()` al final.
 *
 * **El recorrido sigue siendo fila por fila, y eso no es un descuido.** Agrupar
 * las celdas por color deja el halo en siete conmutaciones por frame en vez de
 * las ~25 que salen así, pero cambia el orden de pintado, y con un radio de
 * 10,2 px sobre celdas de 30 los halos de dos celdas vecinas se solapan: medido
 * sobre un montón de 82 celdas con la paleta `neon`, agrupar mueve el **9,14%**
 * de los píxeles del tablero, hasta 98 de 765 de desviación. Conmutar sólo en
 * el cambio de color dibuja **exactamente lo mismo** —0 píxeles distintos— y ya
 * baja las escrituras de estado del contexto de 328 a 75. R12 manda sobre el
 * milisegundo: un motor más rápido que se ve distinto es un motor roto.
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  p: Palette,
  spread: number,
  gloss: string,
): void {
  if (p.glow) {
    const blur = BLOCK * spread;
    let lit = "";
    for (let r = 0; r < ROWS; r++) {
      const row = board[r];
      for (let c = 0; c < COLS; c++) {
        const color = p.pieces[row[c]];
        if (!color) continue;
        // Las celdas de una misma pieza vienen seguidas, así que un tablero real
        // encadena rachas del mismo color y esto conmuta unas pocas veces.
        if (color !== lit) {
          lit = color;
          ctx.fillStyle = color;
          glow(ctx, color, blur);
        }
        ctx.fillRect(c * BLOCK + 2, r * BLOCK + 2, BLOCK - 4, BLOCK - 4);
      }
    }
    // El halo es estado global del contexto: se suelta al salir del bucle, o lo
    // hereda la rejilla del frame siguiente. Un tablero vacío no lo encendió.
    if (lit) noGlow(ctx);
    return;
  }
  for (let r = 0; r < ROWS; r++) {
    const row = board[r];
    for (let c = 0; c < COLS; c++) {
      const color = p.pieces[row[c]];
      if (!color) continue;
      const x = c * BLOCK;
      const y = r * BLOCK;
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, BLOCK - 2, BLOCK - 2);
      ctx.fillStyle = gloss;
      ctx.fillRect(x + 1, y + 1, BLOCK - 2, 4);
    }
  }
}

/**
 * Una matriz de pieza con su esquina superior izquierda en `(px, py)`: la
 * activa, su proyección de aterrizaje y la de la banda derecha.
 *
 * Las celdas de una pieza comparten color, así que el halo se enciende una vez
 * para las cuatro y el orden de pintado no cambia ni un píxel respecto de
 * conmutarlo por celda.
 *
 * El `alpha` es de quien dibuja, no de la piel: con él se pinta translúcida la
 * proyección de aterrizaje, y se conserva igual en las dos ramas. El 0,12 del
 * brillo tampoco es de la piel, que sólo pone su color.
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  shape: Cell[][],
  px: number,
  py: number,
  p: Palette,
  spread: number,
  gloss: string,
  size: number = BLOCK,
  alpha: number = 1,
): void {
  // De las tres piezas que se pintan por frame sólo la proyección de
  // aterrizaje pide un alfa distinto de 1: las otras dos no tocan el contexto.
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (p.glow) {
    const blur = size * spread;
    let lit = "";
    for (let r = 0; r < shape.length; r++) {
      const row = shape[r];
      for (let c = 0; c < row.length; c++) {
        const color = p.pieces[row[c]];
        if (!color) continue;
        if (color !== lit) {
          lit = color;
          ctx.fillStyle = color;
          glow(ctx, color, blur);
        }
        ctx.fillRect(px + c * size + 2, py + r * size + 2, size - 4, size - 4);
      }
    }
    if (lit) noGlow(ctx);
  } else {
    for (let r = 0; r < shape.length; r++) {
      const row = shape[r];
      for (let c = 0; c < row.length; c++) {
        const color = p.pieces[row[c]];
        if (!color) continue;
        const x = px + c * size;
        const y = py + r * size;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        ctx.fillStyle = gloss;
        ctx.fillRect(x + 1, y + 1, size - 2, 4);
      }
    }
  }
  if (alpha !== 1) ctx.globalAlpha = 1;
}
