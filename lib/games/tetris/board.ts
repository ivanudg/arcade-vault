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

import { BLOCK, COLORS, COLS, ROWS, type Cell } from "@/lib/games/tetris/constants";
import type { Piece } from "@/lib/games/tetris/pieces";

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
 * Una celda, en píxeles y no en coordenadas de rejilla: el tablero dibuja en el
 * origen, y la pieza siguiente en la banda derecha con otro tamaño.
 *
 * Es el `drawBlockFlat` del original —el skin Retro, el que trae puesto—:
 * relleno plano con un margen de un píxel y una banda de brillo arriba. Los
 * otros tres skins no entran, así que aquí no hay dispatcher.
 */
export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: Cell,
  size: number = BLOCK,
  alpha: number = 1,
): void {
  const color = COLORS[cell];
  if (!color) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 1, y + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}
