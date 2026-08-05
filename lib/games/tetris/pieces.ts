/**
 * La pieza activa: qué es, cómo se crea y cómo rota.
 *
 * Ocupa el hueco que en Asteroids ocupa `math.ts`. Tetris no tiene geometría
 * continua ni entidades con velocidad: tiene matrices de enteros, y rotar es
 * transponer.
 *
 * Nada de aquí conoce el tablero. Quién colisiona y quién no lo decide
 * `board.ts`; estas funciones solo producen formas y posiciones.
 */

import { COLS, PIECES, TYPES, type Cell } from "@/lib/games/tetris/constants";

/** La pieza que cae. `x`/`y` son la esquina superior izquierda de la matriz. */
export interface Piece {
  type: number;
  shape: Cell[][];
  x: number;
  y: number;
}

/** Gira una matriz 90° en sentido horario. Devuelve una nueva; no muta. */
export function rotateCW(shape: Cell[][]): Cell[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Cell[][] = Array.from({ length: cols }, () => new Array<Cell>(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}

/** Una pieza nueva del tipo dado, centrada arriba y con su matriz propia. */
export function makePiece(type: number): Piece {
  const base = PIECES[type];
  // El índice 0 de `PIECES` es la celda vacía y `type` siempre sale de
  // `randomPiece()`: esto es una guarda de tipos, no un caso que ocurra.
  if (!base) throw new Error(`Tetris: no hay pieza de tipo ${type}.`);
  // Copia fila a fila: la matriz de `PIECES` es la plantilla y no se toca.
  const shape = base.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

/**
 * Una pieza al azar entre los siete tetrominós.
 *
 * El original sorteaba en `[1, 8]`, y el 8 era la tuerca; también tiraba antes
 * por los pentominós con un 15 % de probabilidad. Ninguna de las dos cosas
 * entra todavía, así que el sorteo es plano sobre los siete.
 */
export function randomPiece(): Piece {
  return makePiece(Math.floor(Math.random() * TYPES) + 1);
}
